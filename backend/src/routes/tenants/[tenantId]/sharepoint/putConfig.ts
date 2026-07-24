import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import * as tenantsRepo from '../../../../services/baserow/tenants.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const router = Router({ mergeParams: true });

/**
 * Saves the chosen Site / Drive ids from the Integrations picker.
 *
 * The OAuth callback resolves both automatically from the tenant's root site,
 * which is right for most cabinets. This endpoint lets admins change destination
 * (or finish setup when auto-resolution failed and they land with
 * ?sharepoint=needs_config).
 *
 * Setting both ids is what flips `connected` to true — tokens alone are not a
 * usable connection if we don't know where to write.
 *
 * (authenticate is attached per-route rather than via router.use — see the note
 * in getStatus.ts.)
 */
router.put('/config', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const body = req.body as { siteId?: string; driveId?: string; siteDisplayName?: string };
  const siteId = body.siteId?.trim();
  const driveId = body.driveId?.trim();

  if (!siteId) throw new HttpError(400, 'Site ID est obligatoire');
  if (!driveId) throw new HttpError(400, 'Drive ID est obligatoire');

  const tenant = await tenantsRepo.findTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Tenant not found');
  if (!tenant.sharepoint_refresh_token) {
    throw new HttpError(409, 'Connectez un compte Microsoft avant de configurer le site.');
  }

  const updated = await tenantsRepo.patchTenantSharepoint(tenantId, {
    siteId,
    driveId,
    ...(body.siteDisplayName !== undefined ? { siteDisplayName: body.siteDisplayName.trim() } : {}),
    connected: true,
  });
  if (!updated) throw new HttpError(404, 'Tenant not found');

  res.json({ sharepoint: tenantsRepo.toSharepointStatus(updated) });
}));

export default router;
