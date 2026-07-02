import { FiLoader } from 'react-icons/fi';
import './PageLoading.css';

interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
  compact?: boolean;
}

export default function PageLoading({
  message = 'Chargement…',
  fullScreen = false,
  compact = false,
}: PageLoadingProps) {
  const className = [
    'page-loading',
    fullScreen && 'page-loading--fullscreen',
    compact && 'page-loading--compact',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <FiLoader className="page-loading__icon spin" aria-hidden="true" />
      <p className="page-loading__text">{message}</p>
    </div>
  );
}
