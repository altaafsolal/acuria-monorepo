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
  socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\n\r\n`);
  socket.destroy();
}

async function authenticateUpgrade(request: IncomingMessage): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');
  if (!token) return false;

  try {
    const payload = verifyAccessToken(token);
    const user = await usersRepo.findUserById(payload.user_id);
    return Boolean(user && user.role === 'super_admin');
  } catch {
    return false;
  }
}

export function attachSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    void (async () => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (url.pathname !== '/api/ws') {
        rejectUpgrade(socket, 404, 'Not Found');
        return;
      }

      const authed = await authenticateUpgrade(request);
      if (!authed) {
        rejectUpgrade(socket, 401, 'Unauthorized');
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    })().catch(() => {
      rejectUpgrade(socket, 500, 'Internal Server Error');
    });
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
}
