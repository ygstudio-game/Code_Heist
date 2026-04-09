import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getVaultState,
  startVaultTimer,
  stopVaultTimer,
  syncVaultTime,
  logLifeline,
  logLockPenalty,
  resetVaultData,
} from '../controllers/VaultController';

const router = Router();

// Public — anyone authenticated can view the vault leaderboard
router.get('/state', authenticate, getVaultState);

// Team or Admin actions
router.post('/start', authenticate, startVaultTimer);
router.post('/stop', authenticate, stopVaultTimer);

// Admin-only actions
router.post('/sync', authenticate, requireAdmin, syncVaultTime);
router.post('/lifeline', authenticate, requireAdmin, logLifeline);
router.post('/penalty', authenticate, requireAdmin, logLockPenalty);
router.post('/reset', authenticate, requireAdmin, resetVaultData);

export default router;
