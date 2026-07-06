import clsx from 'clsx';
import { FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';
import { useNotifications } from '../../context/NotificationContext';

const ICONS = {
  success: FiCheckCircle,
  error: FiXCircle,
  info: FiInfo,
} as const;

const VARIANT_CLASSES: Record<string, string> = {
  success: 'border-[#bbf7d0] bg-[#f0fdf4]',
  error:   'border-[#fecaca] bg-[#fef2f2]',
  info:    'border-[#bfdbfe] bg-[#eff6ff]',
};

export default function NotificationContainer() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[1200] flex flex-col gap-3 w-[min(24rem,calc(100vw-2rem))]"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => {
        const Icon = ICONS[notification.variant];
        return (
          <div
            key={notification.id}
            className={clsx(
              'flex items-start gap-3 p-[0.9rem_1rem] rounded-xl bg-white border border-[#e2e8f0] shadow-[0_10px_30px_rgba(15,23,42,0.12)]',
              VARIANT_CLASSES[notification.variant],
            )}
            role="status"
          >
            <Icon className="shrink-0 mt-[0.1rem]" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <strong>{notification.title}</strong>
              {notification.message && (
                <p className="mt-1 mb-0 text-[var(--color-muted)] text-[0.875rem]">{notification.message}</p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 border-none bg-transparent text-[var(--color-muted)] cursor-pointer p-[0.15rem]"
              onClick={() => dismiss(notification.id)}
              aria-label="Fermer la notification"
            >
              <FiX />
            </button>
          </div>
        );
      })}
    </div>
  );
}
