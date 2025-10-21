import { Router } from 'express';

const router = Router();

router.post('/login', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/register', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
