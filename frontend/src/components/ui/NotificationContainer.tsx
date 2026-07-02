import { FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationContainer.css';

const ICONS = {
  success: FiCheckCircle,
  error: FiXCircle,
  info: FiInfo,
} as const;

export default function NotificationContainer() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-stack" aria-live="polite" aria-atomic="false">
      {notifications.map((notification) => {
        const Icon = ICONS[notification.variant];
        return (
          <div
            key={notification.id}
            className={`notification notification--${notification.variant}`}
            role="status"
          >
            <Icon className="notification__icon" aria-hidden="true" />
            <div className="notification__content">
              <strong>{notification.title}</strong>
              {notification.message && <p>{notification.message}</p>}
            </div>
            <button
              type="button"
              className="notification__close"
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
