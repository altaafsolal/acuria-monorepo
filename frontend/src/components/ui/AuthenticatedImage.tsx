import { useAuthenticatedBlob } from '../../hooks/useAuthenticatedBlob';
import {
  getBlobObjectUrlCacheKey,
  getOrCreateBlobObjectUrl,
} from '../../lib/blobObjectUrlCache';

interface AuthenticatedImageProps {
  src?: string;
  dataUrl?: string | null;
  queryKey?: readonly unknown[];
  alt: string;
  className?: string;
}

export default function AuthenticatedImage({
  src,
  dataUrl,
  queryKey,
  alt,
  className,
}: AuthenticatedImageProps) {
  const resolvedQueryKey = queryKey ?? ['authenticated-image', src];
  const shouldFetch = !dataUrl && Boolean(src && queryKey);
  const blobQuery = useAuthenticatedBlob(src, resolvedQueryKey, shouldFetch);

  const blobUrl = blobQuery.data && shouldFetch
    ? getOrCreateBlobObjectUrl(
      getBlobObjectUrlCacheKey(resolvedQueryKey),
      blobQuery.data,
    )
    : null;

  const imageSrc = dataUrl || blobUrl;
  if (!imageSrc) {
    return null;
  }

  return <img src={imageSrc} alt={alt} className={className} />;
}
