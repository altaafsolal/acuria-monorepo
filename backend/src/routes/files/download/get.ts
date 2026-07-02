import axios from 'axios';
import { Router } from 'express';
import { env } from '../../../config/env.js';
import { authenticate } from '../../../middleware/index.js';
import { asyncHandler, HttpError } from '../../../utils/index.js';

const router = Router();

function isAllowedFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const baserow = new URL(env.baserow.apiUrl);
    if (parsed.origin === baserow.origin) return true;

    // Baserow stores uploaded files on S3, not on the API origin.
    if (
      parsed.hostname.endsWith('.s3.amazonaws.com')
      && parsed.pathname.includes('/user_files/')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'fichier';
}

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const url = String(req.query.url ?? '').trim();
  const filename = sanitizeFilename(String(req.query.filename ?? 'fichier'));

  if (!url) {
    throw new HttpError(400, 'url is required');
  }

  if (!isAllowedFileUrl(url)) {
    throw new HttpError(400, 'Invalid file URL');
  }

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000,
  });

  res.setHeader('Content-Type', String(response.headers['content-type'] ?? 'application/octet-stream'));
  res.setHeader('Content-Disposition', contentDisposition(filename));
  response.data.pipe(res);
}));

export default router;
