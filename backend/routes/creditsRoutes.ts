import { Router } from 'express';
import { getCredits, adminAdjustCredits } from '../controllers/creditsController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/balance', authenticate, getCredits);
router.post('/adjust', authenticate, requireAdmin, adminAdjustCredits);

export default router;