import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { clientsRepo, tenantsRepo } from '../../services/baserow/index.js';
import { buildKycVars, previewLdm } from '../../services/make/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';
import type { SendLdmInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/ldm/preview', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as SendLdmInput;

  if (!body?.clientId || !body?.ldmType) {
    throw new HttpError(400, 'clientId and ldmType are required');
  }

  try {
    const [client, tenant] = await Promise.all([
      clientsRepo.getClientById(tenantId, body.clientId),
      tenantsRepo.findTenantById(tenantId),
    ]);
    if (!client) throw new Error('Client not found');

    const vars = buildKycVars(client, {
      signataireName: body.signataireName,
      signataireEmail: body.signataireEmail,
      ldmType: body.ldmType,
      montantForfait: body.montantForfait,
      dropboxPathBase: tenant?.sharepoint_path_base || '',
    });

    const pdfBuffer = await previewLdm(vars);
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    throw new HttpError(400, message);
  }
}));

export default router;
