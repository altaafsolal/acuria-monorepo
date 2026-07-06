import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, kycService } from '../../services/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

const { gestionnairesRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.get('/signataires', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const gestionnaires = await gestionnairesRepo.listGestionnaires(tenantId);
  const signataires = gestionnaires
    .filter((g) => g.status === 'Actif' && g.peutSignerDocusign)
    .map((g) => ({
      name: g.name,
      email: g.email,
      titre: g.role || '',
    }));
  res.json({ signataires });
}));

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
