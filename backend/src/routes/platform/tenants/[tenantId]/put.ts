import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { platformService } from '../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const EDITABLE_STATUSES = ['active', 'inactive'] as const;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.put('/', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const body = req.body as {
    brandingName?: string;
    brandingOrias?: string;
    brandingAccent?: string;
    status?: string;
  };

  if (body.brandingAccent !== undefined && !HEX_COLOR.test(body.brandingAccent)) {
    throw new HttpError(400, 'brandingAccent must be a valid hex color (e.g. #BE845C)');
  }

  if (body.status !== undefined && !EDITABLE_STATUSES.includes(body.status as typeof EDITABLE_STATUSES[number])) {
    throw new HttpError(400, 'status must be active or inactive');
  }

  const tenant = await platformService.updateTenantBranding(tenantId, {
    brandingName: body.brandingName,
    brandingOrias: body.brandingOrias,
    brandingAccent: body.brandingAccent,
    status: body.status,
  });

  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }

  res.json({ tenant });
}));

export default router;
