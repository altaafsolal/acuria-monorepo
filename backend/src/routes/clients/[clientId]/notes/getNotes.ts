import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { notesRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const notes = await notesRepo.listNotesByClient(tenantId, clientId);
  res.json({ notes });
}));

export default router;
