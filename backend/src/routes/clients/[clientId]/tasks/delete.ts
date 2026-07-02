import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const { tasksRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.delete('/:taskId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  await tasksRepo.deleteTask(tenantId, reqParam(req, 'taskId'));
  res.status(204).send();
}));

export default router;
