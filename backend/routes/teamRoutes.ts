import { Router } from 'express';
import { getAllTeams, getTeamById, getMe } from '../controllers/teamController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Leaderboard would be public, but let's keep it behind auth for the heist theme
router.get('/', authenticate, getAllTeams);
router.get('/me', authenticate, getMe);
router.get('/:id', authenticate, getTeamById);

export default router;
