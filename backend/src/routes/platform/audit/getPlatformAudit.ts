import { Router } from 'express';
import { authenticate, requireRole } from '../../../middleware/index.js';
import { auditLogsRepo } from '../../../services/baserow/index.js';
import { asyncHandler } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const size = Number(req.query.pageSize) || 50;
  const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const result = await auditLogsRepo.listAuditLogs({ page, size, tenantId: tenantId || undefined, search });

  res.json(result);
}));

export default router;
