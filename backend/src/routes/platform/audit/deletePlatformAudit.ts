import { Router } from 'express';
import { authenticate, requireRole } from '../../../middleware/index.js';
import { auditLogsRepo } from '../../../services/baserow/index.js';
import { asyncHandler } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

// Purge ALL audit logs. Placed before '/' so it isn't shadowed by the selected-delete route.
router.delete('/all', asyncHandler(async (_req, res) => {
  const deleted = await auditLogsRepo.purgeAuditLogs();
  res.json({ deleted });
}));

// Delete a selected set of audit logs by id.
router.delete('/', asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids must be a non-empty array' });
    return;
  }
  const deleted = await auditLogsRepo.deleteAuditLogs(ids as (string | number)[]);
  res.json({ deleted });
}));

export default router;
