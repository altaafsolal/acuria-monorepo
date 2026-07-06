import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';
import type { SendDerInput, SendLdmInput } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/der/send', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as SendDerInput;

  if (!body?.clientId || !body?.signataireName || !body?.signataireEmail) {
    throw new HttpError(400, 'clientId, signataireName and signataireEmail are required');
  }

  try {
    const client = await kycService.sendDer(tenantId, body);
    res.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send DER';
    throw new HttpError(400, message);
  }
}));

router.post('/ldm/send', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const body = req.body as SendLdmInput;

  if (!body?.clientId || !body?.signataireName || !body?.signataireEmail || !body?.ldmType) {
    throw new HttpError(400, 'clientId, signataireName, signataireEmail and ldmType are required');
  }

  try {
    const client = await kycService.sendLdm(tenantId, body);
    res.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send LdM';
    throw new HttpError(400, message);
  }
}));

router.post('/fcc/send', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const { clientId } = req.body as { clientId?: string };

  if (!clientId) {
    throw new HttpError(400, 'clientId is required');
  }

  try {
    const result = await kycService.sendFcc(tenantId, clientId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send FCC';
    throw new HttpError(400, message);
  }
}));

export default router;
