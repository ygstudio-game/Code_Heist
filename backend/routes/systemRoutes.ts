import { Router } from 'express';
import { getSystemState, updateSystemPhase } from '../controllers/SystemController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/state', authenticate, getSystemState);
router.post('/phase', authenticate, requireAdmin, updateSystemPhase);

export default router;
