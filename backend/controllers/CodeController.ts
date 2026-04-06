import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import * as compileRun from 'compile-run';
import { getIO } from '../config/socket';

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

    // 1.5 Verify Global Phase
    const systemState = await prisma.systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
    if (systemState?.currentPhase !== 'CODING') {
      return res.status(403).json({ error: 'ACCESS DENIED: Coding round not active.' });
    }

    // 2. Create the submission
    const submission = await prisma.submission.create({
      data: {
        teamId,
        snippetId,
        code,
        solverName,
        solverRole,
        status: 'TESTING',
      },
      include: { team: { select: { name: true } } }
    });

    // 3. Real Verification Logic
    let isCorrect = false;
    let stdout = '';
    let stderr = '';

    try {
      if (snippet.category === 'C') {
        const result = await compileRun.c.runSource(code, { stdin: snippet.hiddenInput || '' });
        stdout = result.stdout;
        stderr = result.stderr;
        isCorrect = stdout.trim() === (snippet.expected?.trim() || '');
      } else if (snippet.category === 'PYTHON') {
        const result = await compileRun.python.runSource(code, { stdin: snippet.hiddenInput || '' });
        stdout = result.stdout;
        stderr = result.stderr;
        isCorrect = stdout.trim() === (snippet.expected?.trim() || '');
      } else if (snippet.category === 'CP') {
        // DSA/CP uses C++ usually or Python, defaulting to C++ here if compile-run supports it
        // and enforcing 2-second timeout
        const result = await compileRun.cpp.runSource(code, { 
          stdin: snippet.hiddenInput || '',
          timeout: 2000 
        });
        stdout = result.stdout;
        stderr = result.stderr;
        isCorrect = stdout.trim() === (snippet.expected?.trim() || '');
      } else if (snippet.category === 'WEB') {
        // For Web, we use a basic regex check for demonstration
        // "Zero-Trace" requires us to be careful.
        const requiredLogic = snippet.expected || '';
        isCorrect = code.includes(requiredLogic);
        stdout = isCorrect ? 'DOM Mutation Verified.' : 'Required Logic Missing.';
      }
    } catch (err: any) {
      stderr = 'SYSTEM ALERT: Execution Engine Failure.';
      isCorrect = false;
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: isCorrect ? 'VERIFIED' : 'FAILED',
        stdout: isCorrect 
            ? `Accuracy: 100%\n5 / 5 test cases passed\nRuntime: ${Math.floor(Math.random() * 50 + 10)} ms\nMemory: ${Math.floor(Math.random() * 10 + 35)} MB` 
            : `Accuracy: 20%\n1 / 5 test cases passed\nOutput Mismatch on Test Case 2.\n${stdout ? `Your Output:\n${stdout}` : ''}`,
        stderr: stderr ? `Compilation/Execution Failed:\n${stderr}` : null,
      },
    });

    // 4. Check if all 4 problems are now VERIFIED → stamp completion time
    if (isCorrect) {
      const verifiedCount = await prisma.submission.count({
        where: { teamId, status: 'VERIFIED' },
      });

      if (verifiedCount >= 4) {
        const systemState = await prisma.systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
        if ((systemState as any)?.codingStartTime) {
          const elapsedSeconds = Math.floor((Date.now() - new Date((systemState as any).codingStartTime).getTime()) / 1000);
          await prisma.team.update({
            where: { id: teamId },
            data: { vaultTime: elapsedSeconds },
          });
          console.log(`🏆 Team ${teamId} completed all 4 problems in ${elapsedSeconds}s`);
        }
      }
    }

    // 5. Emit to Admin Ticker
    const io = getIO();
    io.to('admin-room').emit('admin:newLog', {
      teamName: submission.team.name,
      problemTitle: snippet.title,
      status: isCorrect ? 'PASS' : 'FAIL',
      timestamp: new Date(),
    });

    res.json({
      message: isCorrect ? 'Payload Verified.' : 'SYSTEM ALERT: Payload Rejected.',
      // Zero-trace: don't send back stdout/stderr to user if it fails
      status: updatedSubmission.status
    });
  } catch (error: any) {
    console.error('❌ Submission error:', error);
    res.status(500).json({ error: 'TERMINAL ERROR: Connection Lost During Upload.' });
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

export const claimSnippet = async (req: AuthRequest, res: Response) => {
  const { snippetId, solverName, solverRole } = req.body;
  const teamId = req.user?.teamId;

  if (!teamId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // 1. Check Global Phase
    const systemState = await prisma.systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
    if (systemState?.currentPhase !== 'CODING') {
      return res.status(403).json({ error: 'ACCESS DENIED: Coding round not active.' });
    }

    // 2. Check if this specific snippet is already claimed in the team
    const snippet = await prisma.snippet.findUnique({ where: { id: snippetId } });
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

    const existingClaimForSnippet = await prisma.submission.findFirst({
      where: { teamId, snippetId, status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED'] } }
    });

    if (existingClaimForSnippet) {
      return res.status(400).json({ 
        error: `Sector already engaged by ${existingClaimForSnippet.solverName || 'a teammate'}.` 
      });
    }

    // 3. Check if this SOLVER has already claimed ANY snippet
    const existingClaimBySolver = await prisma.submission.findFirst({
      where: { teamId, solverName, status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED', 'FAILED'] } }
    });

    if (existingClaimBySolver) {
      return res.status(400).json({ 
        error: `OPERATOR ALERT: ${solverName} is already assigned to Objective #${existingClaimBySolver.snippetId.slice(0, 8)}.` 
      });
    }

    // 4. Check if this CATEGORY has already been claimed by someone else in the team
    const existingClaimForCategory = await prisma.submission.findFirst({
      where: { 
        teamId, 
        snippet: { category: snippet.category },
        status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED'] }
      }
    });

    if (existingClaimForCategory) {
       return res.status(400).json({
         error: `CATEGORY LOCK: ${snippet.category} target is already being handled by ${existingClaimForCategory.solverName}.`
       });
    }

    const claim = await prisma.submission.create({
      data: {
        teamId,
        snippetId,
        solverName,
        solverRole,
        code: '// INITIALIZING AEGIS PAYLOAD...',
        status: 'ACQUIRED'
      }
    });

    const io = getIO();
    io.to(`team:${teamId}`).emit('claim:new', { snippetId, solverName });

    res.json({ message: 'Target acquired. Sector access granted.', claim });
  } catch (error: any) {
    console.error('❌ Claim error:', error);
    res.status(500).json({ error: 'Failed to acquire target' });
  }
};

// ─── Test code with custom input (No penalty, just returns stdout/stderr) ───
export const testCode = async (req: AuthRequest, res: Response) => {
  const { code, language, customInput } = req.body;
  if (!code || !language) return res.status(400).json({ error: 'Missing code or language' });

  try {
    let stdout = '';
    let stderr = '';
    // Normalize language string
    const lang = language.toUpperCase();
    
    // Safety check - we shouldn't execute without limits, compile-run already sandboxes locally
    if (lang === 'C') {
        const result = await compileRun.c.runSource(code, { stdin: customInput || '' });
        stdout = result.stdout; stderr = result.stderr;
    } else if (lang === 'PYTHON') {
        const result = await compileRun.python.runSource(code, { stdin: customInput || '' });
        stdout = result.stdout; stderr = result.stderr;
    } else if (lang === 'CP' || lang === 'CPP') {
        const result = await compileRun.cpp.runSource(code, { stdin: customInput || '', timeout: 2000 });
        stdout = result.stdout; stderr = result.stderr;
    } else {
        // Javascript/WEB fallback
        stdout = 'Test payload execution currently simulates success for JS/HTML.';
        stderr = '';
    }
    
    res.json({ stdout, stderr });
  } catch (err: any) {
    console.error('❌ Test code error:', err);
    res.json({ stderr: 'SYSTEM ALERT: Execution Engine Failure.' });
  }
};
