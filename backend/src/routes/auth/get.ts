import { Router } from 'express';
import { authenticate } from '../../middleware/index.js';

const router = Router({ mergeParams: true });

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
