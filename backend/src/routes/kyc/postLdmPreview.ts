import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService } from '../../services/index.js';
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
    const pdfBuffer = await kycService.previewLdmPdf(tenantId, body);
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    throw new HttpError(400, message);
  }
}));

export default router;
