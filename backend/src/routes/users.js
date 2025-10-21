import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

export default router;
