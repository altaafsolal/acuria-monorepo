import { Router } from 'express';
import { authenticate } from '../../../../middleware/index.js';
import {
  getAccessTokenForAdmin,
  listSites,
} from '../../../../services/sharepoint/oauth.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';
import { assertTenantAdminFor } from './_guard.js';

const router = Router({ mergeParams: true });

/**
 * Lists SharePoint sites the connected Microsoft account can see.
 * Always includes the org root; optional `q` searches via Graph.
 *
 * (authenticate is attached per-route rather than via router.use — see the note
 * in getStatus.ts.)
 */
router.get('/sites', authenticate, asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  assertTenantAdminFor(req, tenantId);

  const q = typeof req.query.q === 'string' ? req.query.q : '';

  try {
    const accessToken = await getAccessTokenForAdmin(tenantId);
    const sites = await listSites(accessToken, q);
    res.json({ sites });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      error instanceof Error ? error.message : 'Impossible de lister les sites SharePoint.',
    );
  }
}));

export default router;
