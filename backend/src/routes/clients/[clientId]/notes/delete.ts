import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, requireTenant, reqParam } from '../../../../utils/index.js';

const { notesRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.delete('/:noteId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  await notesRepo.deleteNote(tenantId, reqParam(req, 'noteId'));
  res.status(204).send();
}));

export default router;
