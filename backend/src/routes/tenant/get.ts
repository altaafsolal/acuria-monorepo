import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { baserow, platformService } from '../../services/index.js';
import { asyncHandler, HttpError } from '../../utils/index.js';

const { tenantsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/branding', requireRole('tenant_admin', 'standard_user'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user!;

  if (!tenantId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }

  res.json({
    branding: {
      name: tenant.branding_name || tenant.name,
      orias: tenant.branding_orias,
      accent: tenant.branding_accent || '#BE845C',
    },
  });
}));

router.get('/stats', requireRole('tenant_admin'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user!;

  if (!tenantId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const stats = await platformService.getTenantStats(tenantId);
  if (!stats) {
    throw new HttpError(404, 'Tenant not found');
  }
  res.json(stats);
}));

export default router;
