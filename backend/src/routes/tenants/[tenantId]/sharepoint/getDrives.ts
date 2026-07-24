import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import {
  getAccessTokenForAdmin,
  listDrives,
} from '../../../../services/sharepoint/oauth.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const router = Router({ mergeParams: true });

/**
 * Lists document libraries (drives) for a SharePoint site.
 *
 * (authenticate is attached per-route rather than via router.use — see the note
 * in getStatus.ts.)
 */
router.get('/drives', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const siteId = typeof req.query.siteId === 'string' ? req.query.siteId.trim() : '';
  if (!siteId) throw new HttpError(400, 'siteId est obligatoire');

  try {
    const accessToken = await getAccessTokenForAdmin(tenantId);
    const drives = await listDrives(accessToken, siteId);
    res.json({ drives });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      error instanceof Error ? error.message : 'Impossible de lister les bibliothèques SharePoint.',
    );
  }
}));

export default router;
