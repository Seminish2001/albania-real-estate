import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
