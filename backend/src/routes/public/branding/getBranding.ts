import { Router } from 'express';
import { tenantsRepo } from '../../../services/baserow/index.js';
import { asyncHandler, HttpError } from '../../../utils/index.js';

const router = Router({ mergeParams: true });

/**
 * Public (unauthenticated) tenant branding by slug.
 *
 * Serves the login page of a single-tenant / white-label deployment: the frontend
 * is built with VITE_TENANT_SLUG pinned to one tenant, and calls this before login
 * to render that tenant's name/logo AND to learn its id so it can restrict who may
 * sign in. Only non-sensitive branding fields are returned — never tokens or the
 * database credentials on the tenant record.
 */
router.get('/', asyncHandler(async (req, res) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) {
    throw new HttpError(400, 'slug is required');
  }

  const tenant = await tenantsRepo.findTenantBySlugInsensitive(slug);
  if (!tenant || tenant.status !== 'active') {
    throw new HttpError(404, 'Tenant not found');
  }

  const logo = tenantsRepo.getTenantBrandingLogo(tenant);
  const logoDataUrl = logo
    ? await tenantsRepo.resolveTenantBrandingLogoDataUrl(tenant)
    : null;

  res.json({
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.branding_name || tenant.name,
      orias: tenant.branding_orias,
      accent: tenant.branding_accent || '#BE845C',
      hasLogo: Boolean(logo),
      logoDataUrl,
    },
  });
}));

export default router;
