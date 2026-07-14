import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import * as fccSubmissionsRepo from '../../services/baserow/fcc-submissions.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.get('/history', authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  const submissions = clientId
    ? await fccSubmissionsRepo.listSubmissionsByClient(tenantId, clientId)
    : await fccSubmissionsRepo.listAllSubmissions(tenantId);

  res.json({ submissions });
}));

export default router;
