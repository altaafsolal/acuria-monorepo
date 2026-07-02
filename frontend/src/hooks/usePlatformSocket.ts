import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { useNotifications } from '../context/NotificationContext';
import { getAccessToken } from '../lib/http';
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

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) return;
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_MS);
        connect();
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants });
        void queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats });
        notify({
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenants });
        void queryClient.invalidateQueries({ queryKey: queryKeys.platform.stats });
        notify({
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

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        scheduleReconnect();
        return;
      }

      if (socketRef.current) {
        socketRef.current.close();
      }

      const socket = new WebSocket(getPlatformWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_MS;
      });

      socket.addEventListener('message', handleMessage);
      socket.addEventListener('close', scheduleReconnect);
      socket.addEventListener('error', () => {
        socket.close();
      });
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, notify, queryClient]);
}
