import { getAuth } from 'node-sp-auth';
import { env } from '../config/env.js';

export async function uploadToSharePoint(
  filename: string,
  buffer: Buffer,
  _mimeType: string,
): Promise<{ name: string; url: string }> {
  const siteUrl = env.sharepoint.siteUrl;
  if (!siteUrl) throw new Error('SP_SITE_URL is not configured');

  const { pathname, origin } = new URL(siteUrl);
  const folderServerRelUrl = `${pathname}/${env.sharepoint.folder}`;

  const { headers } = await getAuth(siteUrl, {
    username: env.sharepoint.username,
    password: env.sharepoint.password,
    online: true,
  } as Parameters<typeof getAuth>[1]);

  const uploadUrl = `${siteUrl}/_api/web/GetFolderByServerRelativePath(`
    + `decodedurl='${folderServerRelUrl}')`
    + `/Files/add(overwrite=true,url='${encodeURIComponent(filename)}')`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...(headers as Record<string, string>),
      Accept: 'application/json;odata=verbose',
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SharePoint upload failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { d: { Name: string; ServerRelativeUrl: string } };

  return {
    name: data.d.Name,
    url: `${origin}${data.d.ServerRelativeUrl}`,
  };
}
