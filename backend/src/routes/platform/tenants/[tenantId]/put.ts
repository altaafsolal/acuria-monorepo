import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { platformService } from '../../../../services/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../utils/index.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const EDITABLE_STATUSES = ['active', 'inactive'] as const;
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
    if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
      cb(new HttpError(400, `Type de fichier non autorisé : ${file.originalname}`));
      return;
    }
    cb(null, true);
  },
});

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.put('/', upload.single('logo'), asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const body = req.body as {
    brandingName?: string;
    brandingOrias?: string;
    brandingAccent?: string;
    status?: string;
    removeBrandingLogo?: string;
  };

  if (body.brandingAccent !== undefined && body.brandingAccent !== '' && !HEX_COLOR.test(body.brandingAccent)) {
    throw new HttpError(400, 'brandingAccent must be a valid hex color (e.g. #BE845C)');
  }

  if (body.status !== undefined && body.status !== '' && !EDITABLE_STATUSES.includes(body.status as typeof EDITABLE_STATUSES[number])) {
    throw new HttpError(400, 'status must be active or inactive');
  }

  const logoFile = req.file;
  const removeBrandingLogo = body.removeBrandingLogo === 'true' || body.removeBrandingLogo === '1';

  const tenant = await platformService.updateTenantBranding(tenantId, {
    brandingName: body.brandingName,
    brandingOrias: body.brandingOrias,
    brandingAccent: body.brandingAccent,
    status: body.status,
    removeBrandingLogo: removeBrandingLogo || undefined,
    brandingLogo: logoFile
      ? {
        buffer: logoFile.buffer,
        originalName: logoFile.originalname,
        mimeType: logoFile.mimetype,
      }
      : undefined,
  });

  if (!tenant) {
    throw new HttpError(404, 'Tenant not found');
  }

  res.json({ tenant });
}));

export default router;
