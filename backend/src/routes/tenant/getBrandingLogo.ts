import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/index.js';
import { tenantsRepo } from '../../services/baserow/index.js';
import { asyncHandler, HttpError } from '../../utils/index.js';
import { sanitizeFileFilename, streamBaserowFile } from '../../utils/baserow-file.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/branding/logo', requireRole('tenant_admin', 'standard_user'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user!;

  if (!tenantId) {
    throw new HttpError(403, 'No tenant assigned to this account');
  }

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }

  const logo = tenantsRepo.getTenantBrandingLogo(tenant);
  if (!logo) {
    throw new HttpError(404, 'Logo not found');
  }

  const filename = sanitizeFileFilename(logo.visibleName || logo.name || 'logo');
  await streamBaserowFile(res, logo.url, filename, { inline: true });
}));

export default router;
