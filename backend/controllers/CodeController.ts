import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const submitSnippet = async (req: AuthRequest, res: Response) => {
  const { snippetId, code, solverName, solverRole } = req.body;
  const teamId = req.user?.teamId;

  if (!teamId) {
    return res.status(401).json({ error: 'Unauthorized: Team ID not found in token' });
  }

  if (!snippetId || !code) {
    return res.status(400).json({ error: 'Missing required fields: snippetId or code' });
  }

  try {
    // 1. Verify the snippet exists
    const snippet = await prisma.snippet.findUnique({
      where: { id: snippetId },
    });

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    // 2. Create the submission
    // Note: In a real "Heist", we would also run the code against tests here.
    // For now, we'll just record it.
    const submission = await prisma.submission.create({
      data: {
        teamId,
        snippetId,
        code,
        solverName,
        solverRole,
        status: 'TESTING', // Initial status
      },
    });

    // 3. (Mock) Verification Logic
    // In a future phase, this would trigger an async job to run the code.
    // For now, let's just mark it as VERIFIED after a short "processing" simulation
    // if the code is exactly the solution (or just for demo purposes).
    
    // Auto-verify if code contains the snippet solution (very basic check)
    const isCorrect = code.trim() === snippet.solution.trim();
    
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: isCorrect ? 'VERIFIED' : 'FAILED',
        stdout: isCorrect ? 'Test cases passed. Access granted.' : 'Assertion failed: Output mismatch.',
      },
    });

    res.json({
      message: 'Payload uploaded successfully.',
      submission: updatedSubmission,
    });
  } catch (error: any) {
    console.error('❌ Submission error:', error);
    res.status(500).json({ error: 'Failed to process submission', details: error.message });
  }
};

export const getMySubmissions = async (req: AuthRequest, res: Response) => {
  const teamId = req.user?.teamId;

  if (!teamId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const submissions = await prisma.submission.findMany({
      where: { teamId },
      include: { snippet: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};
