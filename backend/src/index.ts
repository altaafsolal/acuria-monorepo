import http from 'http';
import app from './app.js';
import { env, assertProductionSecrets } from './config/env.js';
import { attachSocketServer } from './realtime/socket.js';

assertProductionSecrets();

const server = http.createServer(app);
attachSocketServer(server);

server.listen(env.port, () => {
  console.log(`Acuria backend running on http://localhost:${env.port}`);
});
