import { Router } from 'express';
import { submitSnippet, getMySubmissions, claimSnippet, testCode } from '../controllers/CodeController';
import { authenticate, requireTeam } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { Response } from 'express';

const router = Router();

// Get snippets won by the current team (from auction wins)
router.get('/my-snippets', authenticate, async (req: AuthRequest, res: Response) => {
  const teamId = req.user?.teamId;
  if (!teamId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Find all auction rounds that this team won
    const wonAuctions = await prisma.auctionRound.findMany({
      where: { winnerId: teamId, status: 'COMPLETED' },
      include: {
        snippet: true,
      },
    });

    // Get submission statuses for these snippets
    const snippetIds = wonAuctions.map(a => a.snippetId);
    const submissions = await prisma.submission.findMany({
      where: { teamId, snippetId: { in: snippetIds } },
      orderBy: { createdAt: 'desc' },
    });

    const snippetsWithStatus = wonAuctions.map(auction => {
      const snippetSubmissions = submissions.filter(s => s.snippetId === auction.snippetId);
      const latestSubmission = snippetSubmissions[0];
      return {
        ...auction.snippet,
        auctionWinAmount: auction.winningBid,
        submissionStatus: latestSubmission?.status || null,
        submissionCount: snippetSubmissions.length,
        isVerified: snippetSubmissions.some(s => s.status === 'VERIFIED'),
      };
    });

    res.json(snippetsWithStatus);
  } catch (error: any) {
    console.error('❌ Get my snippets error:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

router.post('/submit', authenticate, requireTeam, submitSnippet);
router.post('/claim', authenticate, requireTeam, claimSnippet);
router.post('/run', authenticate, requireTeam, testCode);
router.get('/my-submissions', authenticate, getMySubmissions);

export default router;
