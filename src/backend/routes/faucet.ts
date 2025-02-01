import { Router } from 'express';
const router = Router();

router.post('/request', (req, res) => {
  res.json({ message: 'Faucet endpoint' });
});

export default router; 