import clsx from 'clsx';
import { FiLoader } from 'react-icons/fi';

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
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4 text-[var(--color-muted)]',
        fullScreen ? 'min-h-screen' : compact ? 'py-10' : 'min-h-[280px] py-12 px-6',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <FiLoader
        className={clsx('text-[var(--color-navy)] animate-spin-app', compact ? 'w-7 h-7' : 'w-9 h-9')}
        aria-hidden="true"
      />
      <p className="m-0 text-[0.95rem] font-medium text-[var(--color-muted)]">{message}</p>
    </div>
  );
}
