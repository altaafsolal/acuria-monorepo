import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { useNotifications } from '../context/NotificationContext';
import { ensureFreshAccessToken, getAccessToken } from '../lib/http';
import { showBrowserNotification } from '../lib/notifications';
import { getPlatformWsUrl } from '../lib/ws';
import type { Tenant } from '../types';

interface TenantProvisionedEvent {
  type: 'tenant.provisioned';
  tenant: Tenant;
}

interface TenantFailedEvent {
  type: 'tenant.failed';
  tenantId: string;
  name: string;
  error?: string;
}

type PlatformSocketEvent = TenantProvisionedEvent | TenantFailedEvent;

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function usePlatformSocket(enabled: boolean): void {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_MS);
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);
  /** Suppress the close→reconnect path when we close on purpose (cleanup / replace). */
  const intentionalCloseRef = useRef(false);
  const notifyRef = useRef(notify);
  const queryClientRef = useRef(queryClient);
  notifyRef.current = notify;
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    shouldReconnectRef.current = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = (socket: WebSocket | null) => {
      if (!socket) return;
      intentionalCloseRef.current = true;
      socket.close();
    };

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return;
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_MS);
        void connect();
      }, reconnectDelayRef.current);
    };

    const handleMessage = (event: MessageEvent<string>) => {
      let payload: PlatformSocketEvent;
      try {
        payload = JSON.parse(event.data) as PlatformSocketEvent;
      } catch {
        return;
      }

      if (payload.type === 'tenant.provisioned') {
        void queryClientRef.current.invalidateQueries({ queryKey: queryKeys.platform.tenants });
        void queryClientRef.current.invalidateQueries({ queryKey: queryKeys.platform.stats });
        notifyRef.current({
          title: 'Tenant prêt',
          message: `${payload.tenant.name} est maintenant disponible.`,
          variant: 'success',
        });
        showBrowserNotification(
          'Tenant prêt',
          `${payload.tenant.name} est maintenant disponible.`,
        );
        return;
      }

      if (payload.type === 'tenant.failed') {
        void queryClientRef.current.invalidateQueries({ queryKey: queryKeys.platform.tenants });
        void queryClientRef.current.invalidateQueries({ queryKey: queryKeys.platform.stats });
        notifyRef.current({
          title: 'Échec de création du tenant',
          message: payload.error
            ? `${payload.name}: ${payload.error}`
            : `La création de ${payload.name} a échoué.`,
          variant: 'error',
        });
        showBrowserNotification(
          'Échec de création du tenant',
          payload.error
            ? `${payload.name}: ${payload.error}`
            : `La création de ${payload.name} a échoué.`,
        );
      }
    };

    const connect = async () => {
      // Prefer a non-expired access token — WS auth is query-string JWT, no 401 retry.
      const token = (await ensureFreshAccessToken()) ?? getAccessToken();
      if (!token) {
        scheduleReconnect();
        return;
      }

      if (!shouldReconnectRef.current) return;

      // Replace any existing socket without treating the close as a drop.
      if (socketRef.current) {
        const previous = socketRef.current;
        socketRef.current = null;
        closeSocket(previous);
      }

      const socket = new WebSocket(getPlatformWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_MS;
      });

      socket.addEventListener('message', handleMessage);
      socket.addEventListener('close', (event) => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }
        if (import.meta.env.DEV) {
          console.warn('[ws] closed', event.code, event.reason || '(no reason)');
        }
        scheduleReconnect();
      });
      socket.addEventListener('error', () => {
        // Let the close handler schedule reconnect (avoid double-scheduling).
        socket.close();
      });
    };

    void connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      closeSocket(socket);
    };
  }, [enabled]);
}
