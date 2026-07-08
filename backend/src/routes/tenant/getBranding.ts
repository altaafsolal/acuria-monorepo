import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { tenantsRepo } from '../../services/baserow/index.js';
import { asyncHandler, HttpError } from '../../utils/index.js';

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

  const logo = tenantsRepo.getTenantBrandingLogo(tenant);
  const logoDataUrl = logo
    ? await tenantsRepo.resolveTenantBrandingLogoDataUrl(tenant)
    : null;

  res.json({
    branding: {
      name: tenant.branding_name || tenant.name,
      orias: tenant.branding_orias,
      accent: tenant.branding_accent || '#BE845C',
      hasLogo: Boolean(logo),
      logoDataUrl,
    },
  });
}));

export default router;
