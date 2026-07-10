import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { auditLogsRepo } from '../../services/baserow/index.js';
import { asyncHandler} from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin'), requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const page = Number(req.query.page) || 1;
  const size = Number(req.query.pageSize) || 50;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const result = await auditLogsRepo.listAuditLogs({ tenantId, page, size, userId: userId || undefined, search });

  res.json(result);
}));

export default router;
