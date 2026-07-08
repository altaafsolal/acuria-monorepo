import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { tenantsRepo } from '../../../../../services/baserow/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';
import { sanitizeFileFilename, streamBaserowFile } from '../../../../../utils/baserow-file.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.get('/', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
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
