import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { tasksRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const { title, description, status, priorite, assigneA, dueDate } = req.body as {
    title?: string;
    description?: string;
    status?: string;
    priorite?: string;
    assigneA?: string;
    dueDate?: string;
  };

  if (!title) {
    throw new HttpError(400, 'title is required');
  }
  if (!assigneA?.trim()) {
    throw new HttpError(400, 'assigneA is required');
  }

  const task = await tasksRepo.createTask(tenantId, {
    clientId,
    title,
    description,
    status,
    priorite,
    assigneA: assigneA.trim(),
    creePar: req.user?.name || '',
    dueDate,
  });
  res.status(201).json({ task });
}));

export default router;
