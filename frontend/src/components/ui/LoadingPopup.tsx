import { FiLoader } from 'react-icons/fi';

interface LoadingPopupProps {
  show: boolean;
  title: string;
  message?: string;
}

export default function LoadingPopup({ show, title, message }: LoadingPopupProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[500] grid place-items-center p-4 bg-[rgba(13,27,64,0.54)] backdrop-blur-[4px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(100%,360px)] p-[1.75rem_1.5rem] text-center bg-white rounded-[14px] shadow-md">
        <FiLoader
          className="w-8 h-8 mb-[0.9rem] text-[var(--color-navy)] animate-spin-app"
          aria-hidden="true"
        />
        <h2 className="m-0 text-[1.05rem] text-[var(--color-navy)]">{title}</h2>
        {message && <p className="mt-2 mb-0 text-[var(--color-muted)] text-[0.9rem]">{message}</p>}
      </div>
    </div>
  );
}
