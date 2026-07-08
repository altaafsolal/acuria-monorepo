import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { clientsRepo, tenantsRepo } from '../../services/baserow/index.js';
import { buildKycVars, sendDerEmail } from '../../services/make/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';
import type { SendDerInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/der/send', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as SendDerInput;

  if (!body?.clientId || !body?.signataireName || !body?.signataireEmail) {
    throw new HttpError(400, 'clientId, signataireName and signataireEmail are required');
  }

  try {
    const [client, tenant] = await Promise.all([
      clientsRepo.getClientById(tenantId, body.clientId),
      tenantsRepo.findTenantById(tenantId),
    ]);
    if (!client) throw new Error('Client not found');
    if (!client.email) throw new Error('Email client manquant');

    const vars = buildKycVars(client, {
      signataireName: body.signataireName,
      signataireEmail: body.signataireEmail,
      ldmType: body.ldmType,
      montantForfait: body.montantForfait,
      dropboxPathBase: tenant?.dropbox_path_base || '',
    });

    await sendDerEmail(vars, tenant?.branding_name || tenant?.name || '', tenant?.email || '');

    const today = new Date().toISOString().split('T')[0];
    const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
      der_statut: 'Envoyé',
      der_date: today,
      der_envoi_timestamp: new Date().toISOString(),
    });

    res.json({ client: clientsRepo.toPublicClient(updated!) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send DER';
    throw new HttpError(400, message);
  }
}));

export default router;
