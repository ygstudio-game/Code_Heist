import { Router } from 'express';
import { getActiveAuction, placeBid, getAuctionHistory } from '../controllers/AuctionController';
import { authenticate, requireTeam } from '../middleware/authMiddleware';

const router = Router();

router.get('/active', authenticate, getActiveAuction);
router.post('/bid', authenticate, requireTeam, placeBid);
router.get('/history', authenticate, getAuctionHistory);

export default router;
