import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { tasksRepo, gestionnairesRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const user = req.user!;
  const { tasks, dbTasks } = await tasksRepo.listBothTasksByClient(tenantId, clientId);

  let filtered = tasks;
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    const gestionnaire = await gestionnairesRepo.findGestionnaireByUserId(tenantId, user.id);
    const gestionnaireName = gestionnaire?.name ?? null;
    const byId = new Map(dbTasks.map((t) => [t.id, t]));
    filtered = tasks.filter((t) => {
      const db = byId.get(t.id);
      if (!db) return false;
      if (db.cree_par && db.cree_par === user.name) return true;
      if (gestionnaireName && db.assigne_a === gestionnaireName) return true;
      return false;
    });
  }

  res.json({ tasks: filtered });
}));

export default router;
