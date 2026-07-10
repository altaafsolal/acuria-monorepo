import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { tasksRepo, gestionnairesRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, HttpError,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.delete('/:taskId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const taskId = reqParam(req, 'taskId');
  const user = req.user!;

  const existing = await tasksRepo.getTaskById(tenantId, taskId);
  if (!existing) {
    throw new HttpError(404, 'Task not found');
  }

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    const gestionnaire = await gestionnairesRepo.findGestionnaireByUserId(tenantId, user.id);
    const gestionnaireName = gestionnaire?.name ?? null;
    const canAccess = (
      (existing.cree_par && existing.cree_par === user.name) ||
      (gestionnaireName !== null && existing.assigne_a === gestionnaireName)
    );
    if (!canAccess) {
      throw new HttpError(404, 'Task not found');
    }
  }

  await tasksRepo.deleteTask(tenantId, taskId);
  res.status(204).send();
}));

export default router;
