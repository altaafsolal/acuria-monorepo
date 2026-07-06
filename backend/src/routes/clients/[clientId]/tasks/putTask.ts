import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { assertTaskAccess } from '../../../../services/lib/task-access.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const { tasksRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.put('/:taskId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const taskId = reqParam(req, 'taskId');
  const user = req.user!;
  const body = req.body as { assigneA?: string };
  if (body.assigneA !== undefined && !body.assigneA.trim()) {
    throw new HttpError(400, 'assigneA cannot be empty');
  }

  const existing = await tasksRepo.getTaskById(tenantId, taskId);
  if (!existing) {
    throw new HttpError(404, 'Task not found');
  }
  try {
    await assertTaskAccess(tenantId, existing, {
      userId: user.id,
      userName: user.name,
      role: user.role,
    });
  } catch {
    throw new HttpError(404, 'Task not found');
  }

  const task = await tasksRepo.updateTask(tenantId, taskId, req.body);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  res.json({ task });
}));

export default router;
