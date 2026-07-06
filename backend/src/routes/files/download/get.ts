import { Router } from 'express';
import { authenticate } from '../../../middleware/index.js';
import { asyncHandler, HttpError } from '../../../utils/index.js';
import {
  isAllowedBaserowFileUrl,
  sanitizeFileFilename,
  streamBaserowFile,
} from '../../../utils/baserow-file.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const url = String(req.query.url ?? '').trim();
  const filename = sanitizeFileFilename(String(req.query.filename ?? 'fichier'));
  const inline = req.query.inline === '1' || req.query.inline === 'true';

  if (!url) {
    throw new HttpError(400, 'url is required');
  }

  if (!isAllowedBaserowFileUrl(url)) {
    throw new HttpError(400, 'Invalid file URL');
  }

  await streamBaserowFile(res, url, filename, { inline });
}));

export default router;
