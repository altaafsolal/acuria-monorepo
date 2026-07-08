import { Router } from 'express';
import { api } from '../../services/baserow/index.js';
import { asyncHandler, toIsoString } from '../../utils/index.js';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (_req, res) => {
  const connection = await api.testConnection();
  res.json({
    status: connection.connected ? 'ok' : 'degraded',
    service: 'acuria-backend',
    timestamp: toIsoString(),
    baserow: connection,
  });
}));

export default router;
