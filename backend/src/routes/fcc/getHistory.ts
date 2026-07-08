import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import * as fccSubmissionsRepo from '../../services/baserow/fcc-submissions.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/history', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  const submissions = clientId
    ? await fccSubmissionsRepo.listSubmissionsByClient(tenantId, clientId)
    : await fccSubmissionsRepo.listAllSubmissions(tenantId);

  res.json({ submissions });
}));

export default router;
