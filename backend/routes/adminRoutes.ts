import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getAllSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  startAuction,
  endAuction,
  applyPenalty,
  resetStrikes,
  getGameState,
  getAllSubmissions,
  forceApproveSubmission,
  forceRejectSubmission,
  forceResetSubmission,
  releaseProblemClaim,
} from '../controllers/AdminController';
import { adminAdjustCredits } from '../controllers/creditsController';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Snippets
router.get('/snippets', getAllSnippets);
router.post('/snippets', createSnippet);
router.put('/snippets/:id', updateSnippet);
router.delete('/snippets/:id', deleteSnippet);

// Auction control
router.post('/auction/start', startAuction);
router.post('/auction/end', endAuction);

// Manual Overrides
router.post('/submissions/:id/force-approve', forceApproveSubmission);
router.post('/submissions/:id/force-reject', forceRejectSubmission);
router.post('/submissions/:id/force-reset', forceResetSubmission);
router.post('/submissions/release-claim', releaseProblemClaim);

// Penalties
router.post('/penalty', applyPenalty);
router.post('/penalty/reset', resetStrikes);

// Credits
router.post('/credits/adjust', adminAdjustCredits);

// Game state
router.get('/game-state', getGameState);
router.get('/submissions', getAllSubmissions);

export default router;
