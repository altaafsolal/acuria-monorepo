import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Server } from 'http';
import { verifyAccessToken } from '../utils/jwt.js';
import { usersRepo } from '../services/baserow/index.js';

const clients = new Set<WebSocket>();

export function broadcast(event: unknown): void {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function rejectUpgrade(socket: Duplex, statusCode: number, statusText: string): void {
  if (socket.destroyed) return;
  try {
    socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`);
  } catch {
    // socket already half-closed by the proxy
  }
  socket.destroy();
}

async function authenticateUpgrade(request: IncomingMessage): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');
  if (!token) return false;

  try {
    const payload = verifyAccessToken(token);
    // Fast path: JWT already carries role — reject non-admins without a Baserow round-trip.
    // Still re-load the user so a deactivated super_admin cannot stay connected.
    if (payload.role !== 'super_admin') return false;
    const user = await usersRepo.findUserById(payload.user_id);
    return Boolean(user && user.role === 'super_admin' && (!user.status || user.status === 'active'));
  } catch {
    return false;
  }
}

export function attachSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    void (async () => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      // Tolerate trailing slash from proxies / misconfigured clients.
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (path !== '/api/ws') {
        rejectUpgrade(socket, 404, 'Not Found');
        return;
      }

      const authed = await authenticateUpgrade(request);
      if (!authed) {
        console.warn('[ws] upgrade rejected (missing/invalid token or not super_admin)');
        rejectUpgrade(socket, 401, 'Unauthorized');
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    })().catch((error) => {
      console.error('[ws] upgrade error:', error instanceof Error ? error.message : error);
      rejectUpgrade(socket, 500, 'Internal Server Error');
    });
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[ws] client connected (${clients.size} open)`);
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[ws] client disconnected (${clients.size} open)`);
    });
    ws.on('error', () => clients.delete(ws));
  });
}
