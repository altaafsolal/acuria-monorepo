import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import * as fccSubmissionsRepo from '../../services/baserow/fcc-submissions.js';
import * as clientsRepo from '../../services/baserow/clients.js';
import { asyncHandler, HttpError} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

// Mark an FCC submission as validated and update client FCC status to Signé
router.post('/quick-validate', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { submissionId, clientId } = req.body as { submissionId?: string; clientId?: string };

  if (!submissionId && !clientId) {
    throw new HttpError(400, 'submissionId or clientId is required');
  }

  // Update submission status
  if (submissionId) {
    await fccSubmissionsRepo.updateSubmissionStatus(tenantId, submissionId, 'Signé');
  }

  // Update client FCC status
  if (clientId) {
    const client = await clientsRepo.getClientById(tenantId, clientId);
    if (!client) throw new HttpError(404, 'Client not found');

    const updated = await clientsRepo.patchClientKycFields(tenantId, clientId, {
      fcc_statut: 'Signé',
      fcc_date: client.fcc_date || new Date().toISOString().split('T')[0],
    });

    // If no submissionId provided, find latest submission for this client
    if (!submissionId) {
      const submissions = await fccSubmissionsRepo.listSubmissionsByClient(tenantId, clientId).catch(() => []);
      if (submissions.length > 0) {
        const latest = submissions[submissions.length - 1];
        await fccSubmissionsRepo.updateSubmissionStatus(tenantId, latest.id, 'Signé').catch(() => undefined);
      }
    }

    res.json({ client: clientsRepo.toPublicClient(updated!) });
    return;
  }

  res.json({ ok: true });
}));

export default router;
