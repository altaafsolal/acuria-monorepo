import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { kycService, makeService } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const { NM_SIGNATAIRES } = makeService;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/signataires', (_req, res) => {
  res.json({ signataires: Object.values(NM_SIGNATAIRES) });
});

router.get('/der', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const filter = String(req.query.filter || '');
  const clients = await kycService.listDerClients(tenantId, filter);
  res.json({ clients });
}));

router.get('/fcc', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const filter = String(req.query.filter || '');
  const clients = await kycService.listFccClients(tenantId, filter);
  res.json({ clients });
}));

export default router;
