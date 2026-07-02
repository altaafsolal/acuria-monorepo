import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const { tasksRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.put('/:taskId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const task = await tasksRepo.updateTask(tenantId, reqParam(req, 'taskId'), req.body);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  res.json({ task });
}));

export default router;
