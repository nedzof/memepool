import { Router } from 'express';
const router = Router();

// Add temporary basic route
router.get('/', (req, res) => {
  res.json({ message: 'Inscriptions endpoint' });
});

export default router; 