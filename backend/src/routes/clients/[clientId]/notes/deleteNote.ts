import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { notesRepo } from '../../../../services/baserow/index.js';
import { asyncHandler,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.delete('/:noteId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await notesRepo.deleteNote(tenantId, reqParam(req, 'noteId'));
  res.status(204).send();
}));

export default router;
