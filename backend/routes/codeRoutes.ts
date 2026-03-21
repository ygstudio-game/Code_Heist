import { Router } from 'express';
import { submitSnippet, getMySubmissions } from '../controllers/CodeController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/submit', authenticate, submitSnippet);
router.get('/my-submissions', authenticate, getMySubmissions);

export default router;
