import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { gestionnairesRepo } from '../../services/baserow/index.js';
import { asyncHandler, requireTenant } from '../../utils/index.js';

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

export default router;
