import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type NotificationVariant = 'success' | 'error' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message?: string;
  variant: NotificationVariant;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  notify: (input: Omit<AppNotification, 'id'>) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let notificationCounter = 0;

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((input: Omit<AppNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${notificationCounter += 1}`;
    const notification: AppNotification = { id, ...input };

    setNotifications((current) => [...current, notification]);

    window.setTimeout(() => {
      dismiss(id);
    }, 6000);
  }, [dismiss]);

  const value = useMemo(
    () => ({ notifications, notify, dismiss }),
    [notifications, notify, dismiss],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
