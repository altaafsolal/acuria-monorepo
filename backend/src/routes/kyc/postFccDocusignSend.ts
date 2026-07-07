import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService } from '../../services/index.js';
import { asyncHandler, HttpError, requireTenant } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/fcc/docusign', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const { clientId } = req.body as { clientId?: string };

  if (!clientId) {
    throw new HttpError(400, 'clientId is required');
  }

  try {
    const client = await kycService.sendFccDocusign(tenantId, clientId);
    res.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send FCC to DocuSign';
    throw new HttpError(400, message);
  }
}));

export default router;
