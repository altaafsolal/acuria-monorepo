import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { clientsRepo, tenantsRepo, tenantTables } from '../../services/baserow/index.js';
import { buildKycVars, derIsSent, ldmAvailableDate, ldmIsUnlocked, sendLdmDocuSign } from '../../services/make/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';
import type { SendLdmInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/ldm/send', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as SendLdmInput;

  if (!body?.clientId || !body?.signataireName || !body?.signataireEmail || !body?.ldmType) {
    throw new HttpError(400, 'clientId, signataireName, signataireEmail and ldmType are required');
  }

  try {
    const [client, tenant, clientsTableId] = await Promise.all([
      clientsRepo.getClientById(tenantId, body.clientId),
      tenantsRepo.findTenantById(tenantId),
      tenantTables.resolveTenantTableId(tenantId, 'clients'),
    ]);
    if (!client) throw new Error('Client not found');
    if (!derIsSent(client.der_statut)) throw new Error('La DER doit être envoyée avant la LdM');
    if (!ldmIsUnlocked(client.der_date)) {
      const avail = ldmAvailableDate(client.der_date);
      throw new Error(`LdM disponible à partir du ${avail?.toLocaleDateString('fr-FR')} (délai AMF 48h)`);
    }

    const vars = buildKycVars(client, {
      signataireName: body.signataireName,
      signataireEmail: body.signataireEmail,
      ldmType: body.ldmType,
      montantForfait: body.montantForfait,
      dropboxPathBase: tenant?.sharepoint_path_base || '',
    });

    const tenantName = tenant?.branding_name || tenant?.name || '';
    const tenantEmail = tenant?.email || '';
    await sendLdmDocuSign(vars, tenantName, tenantEmail, tenant?.sharepoint_path_base || '', clientsTableId);

    const updated = await clientsRepo.patchClientKycFields(tenantId, client.id, {
      ldm_statut: 'Envoyé',
      ldm_date: new Date().toISOString().split('T')[0],
    });

    res.json({ client: clientsRepo.toPublicClient(updated!) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send LdM';
    throw new HttpError(400, message);
  }
}));

export default router;
