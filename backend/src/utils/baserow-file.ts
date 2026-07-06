import axios from 'axios';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { HttpError } from './http.js';

const LOGO_DATA_URL_CACHE_TTL_MS = 10 * 60 * 1000;
const logoDataUrlCache = new Map<string, { dataUrl: string; expiresAt: number }>();

export function isAllowedBaserowFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const baserow = new URL(env.baserow.apiUrl);
    if (parsed.origin === baserow.origin) return true;

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

function contentDisposition(filename: string, inline: boolean): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  const type = inline ? 'inline' : 'attachment';
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function sanitizeFileFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'fichier';
}

export function invalidateBaserowFileDataUrlCache(cacheKey: string): void {
  logoDataUrlCache.delete(cacheKey);
}

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  const mime = contentType.split(';')[0]?.trim() || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export async function fetchBaserowFileBuffer(
  url: string,
  { maxBytes }: { maxBytes?: number } = {},
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!url.trim() || !isAllowedBaserowFileUrl(url)) {
    return null;
  }

  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    ...(maxBytes ? { maxContentLength: maxBytes, maxBodyLength: maxBytes } : {}),
  });

  const buffer = Buffer.from(response.data);
  if (maxBytes && buffer.length > maxBytes) {
    return null;
  }

  return {
    buffer,
    contentType: String(response.headers['content-type'] ?? 'application/octet-stream'),
  };
}

export async function fetchBaserowFileDataUrl(
  url: string,
  {
    maxBytes = 512 * 1024,
    cacheKey,
  }: { maxBytes?: number; cacheKey?: string } = {},
): Promise<string | null> {
  if (cacheKey) {
    const cached = logoDataUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.dataUrl;
    }
  }

  const file = await fetchBaserowFileBuffer(url, { maxBytes });
  if (!file) {
    return null;
  }

  const dataUrl = bufferToDataUrl(file.buffer, file.contentType);
  if (cacheKey) {
    logoDataUrlCache.set(cacheKey, {
      dataUrl,
      expiresAt: Date.now() + LOGO_DATA_URL_CACHE_TTL_MS,
    });
  }

  return dataUrl;
}

export async function streamBaserowFile(
  res: Response,
  url: string,
  filename: string,
  { inline = false }: { inline?: boolean } = {},
): Promise<void> {
  if (!url.trim()) {
    throw new HttpError(400, 'url is required');
  }

  if (!isAllowedBaserowFileUrl(url)) {
    throw new HttpError(400, 'Invalid file URL');
  }

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000,
  });

  res.setHeader('Content-Type', String(response.headers['content-type'] ?? 'application/octet-stream'));
  res.setHeader('Content-Disposition', contentDisposition(filename, inline));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  response.data.pipe(res);
}
