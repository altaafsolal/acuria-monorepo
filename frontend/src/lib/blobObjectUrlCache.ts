const objectUrlByKey = new Map<string, string>();

export function getBlobObjectUrlCacheKey(queryKey: readonly unknown[]): string {
  return JSON.stringify(queryKey);
}

export function getOrCreateBlobObjectUrl(cacheKey: string, blob: Blob): string {
  const existing = objectUrlByKey.get(cacheKey);
  if (existing) {
    return existing;
  }

  const objectUrl = URL.createObjectURL(blob);
  objectUrlByKey.set(cacheKey, objectUrl);
  return objectUrl;
}

export function revokeBlobObjectUrl(cacheKey: string): void {
  const objectUrl = objectUrlByKey.get(cacheKey);
  if (!objectUrl) {
    return;
  }

  URL.revokeObjectURL(objectUrl);
  objectUrlByKey.delete(cacheKey);
}

export function revokeBlobObjectUrls(queryKeys: readonly (readonly unknown[])[]): void {
  for (const queryKey of queryKeys) {
    revokeBlobObjectUrl(getBlobObjectUrlCacheKey(queryKey));
  }
}
