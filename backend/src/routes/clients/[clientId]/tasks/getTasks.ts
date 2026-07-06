import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { filterTasksForUser } from '../../../../services/lib/task-access.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const { tasksRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const user = req.user!;
  const { tasks, dbTasks } = await tasksRepo.listBothTasksByClient(tenantId, clientId);
  const filtered = await filterTasksForUser(tenantId, tasks, dbTasks, {
    userId: user.id,
    userName: user.name,
    role: user.role,
  });
  res.json({ tasks: filtered });
}));

export default router;
