import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
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

type NotifyFn = (input: {
  title: string;
  message?: string;
  variant: 'success' | 'error' | 'info';
}) => void;

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
/** Only treat a connection as "healthy" (reset backoff) after it stays open this long. */
const STABLE_OPEN_MS = 5000;

/**
 * Module singleton — DashboardLayout remounts (Strict Mode, HMR, auth blips) must not
 * open parallel sockets. Each upgrade hits Baserow for auth; a reconnect storm freezes
 * the rest of the API and the page looks "stuck loading".
 */
let sharedSocket: WebSocket | null = null;
let sharedSubscriberCount = 0;
let sharedShouldRun = false;
let sharedReconnectDelay = INITIAL_RECONNECT_MS;
let sharedReconnectTimer: number | null = null;
let sharedConnectGeneration = 0;
let sharedStableTimer: number | null = null;
let sharedQueryClient: QueryClient | null = null;
let sharedNotify: NotifyFn | null = null;

function clearSharedReconnectTimer(): void {
  if (sharedReconnectTimer !== null) {
    window.clearTimeout(sharedReconnectTimer);
    sharedReconnectTimer = null;
  }
}

function clearSharedStableTimer(): void {
  if (sharedStableTimer !== null) {
    window.clearTimeout(sharedStableTimer);
    sharedStableTimer = null;
  }
}

function disposeSharedSocket(): void {
  clearSharedStableTimer();
  const socket = sharedSocket;
  sharedSocket = null;
  if (!socket) return;
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
}

function scheduleSharedReconnect(): void {
  if (!sharedShouldRun || sharedSubscriberCount === 0) return;
  clearSharedReconnectTimer();
  sharedReconnectTimer = window.setTimeout(() => {
    sharedReconnectDelay = Math.min(sharedReconnectDelay * 2, MAX_RECONNECT_MS);
    void openSharedSocket();
  }, sharedReconnectDelay);
}

function handleSharedMessage(event: MessageEvent<string>): void {
  let payload: PlatformSocketEvent;
  try {
    payload = JSON.parse(event.data) as PlatformSocketEvent;
  } catch {
    return;
  }

  const queryClient = sharedQueryClient;
  const notify = sharedNotify;
  if (!queryClient || !notify) return;

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
}

async function openSharedSocket(): Promise<void> {
  if (!sharedShouldRun || sharedSubscriberCount === 0) return;
  if (
    sharedSocket
    && (sharedSocket.readyState === WebSocket.OPEN
      || sharedSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const generation = ++sharedConnectGeneration;
  const token = (await ensureFreshAccessToken()) ?? getAccessToken();
  if (generation !== sharedConnectGeneration) return;
  if (!sharedShouldRun || sharedSubscriberCount === 0) return;

  if (!token) {
    scheduleSharedReconnect();
    return;
  }

  disposeSharedSocket();

  const socket = new WebSocket(getPlatformWsUrl(token));
  sharedSocket = socket;

  socket.addEventListener('open', () => {
    if (sharedSocket !== socket) return;
    clearSharedStableTimer();
    sharedStableTimer = window.setTimeout(() => {
      if (sharedSocket === socket) {
        sharedReconnectDelay = INITIAL_RECONNECT_MS;
      }
    }, STABLE_OPEN_MS);
  });

  socket.addEventListener('message', handleSharedMessage);

  socket.addEventListener('close', (event) => {
    if (sharedSocket === socket) {
      sharedSocket = null;
    }
    clearSharedStableTimer();
    if (!sharedShouldRun || sharedSubscriberCount === 0) return;
    if (import.meta.env.DEV) {
      console.warn('[ws] closed', event.code, event.reason || '(no reason)');
    }
    scheduleSharedReconnect();
  });

  socket.addEventListener('error', () => {
    // close handler owns reconnect scheduling
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  });
}

function subscribeSharedSocket(queryClient: QueryClient, notify: NotifyFn): () => void {
  sharedQueryClient = queryClient;
  sharedNotify = notify;
  sharedSubscriberCount += 1;
  sharedShouldRun = true;

  if (sharedSubscriberCount === 1) {
    sharedReconnectDelay = INITIAL_RECONNECT_MS;
    void openSharedSocket();
  }

  return () => {
    sharedSubscriberCount = Math.max(0, sharedSubscriberCount - 1);
    if (sharedSubscriberCount > 0) return;

    sharedShouldRun = false;
    sharedConnectGeneration += 1;
    clearSharedReconnectTimer();
    disposeSharedSocket();
  };
}

export function usePlatformSocket(enabled: boolean): void {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const notifyRef = useRef(notify);
  const queryClientRef = useRef(queryClient);
  notifyRef.current = notify;
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!enabled) return undefined;

    return subscribeSharedSocket(queryClientRef.current, (input) => {
      notifyRef.current(input);
    });
  }, [enabled]);
}
