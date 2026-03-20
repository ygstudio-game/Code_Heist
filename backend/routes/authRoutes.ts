import { Router } from 'express';
import { login, getMe, registerTeam } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerTeam);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;