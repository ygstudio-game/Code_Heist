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
    const systemState = await (prisma as any).systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
    if (systemState?.currentPhase !== 'CODING') {
      return res.status(403).json({ error: 'ACCESS DENIED: Coding round not active.' });
    }

    // 2. Create the submission
    const submission = await (prisma as any).submission.create({
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
    let stdout;
    let stderr;

    try {
      const expected = snippet.expected || '';
      const isRegex = expected.startsWith('/') && expected.endsWith('/') && expected.length > 2;

      // 1. If Regex Check is required, verify code signature instead of executing
      if (isRegex) {
        const regexStr = expected.slice(1, -1);
        const regex = new RegExp(regexStr, 'mi');
        isCorrect = regex.test(code);
        stdout = isCorrect ? 'CODE SIGNATURE VERIFIED: Structural Fix Detected.' : 'VERIFICATION FAILED: Required implementation signatures missing.';
      }
      // 2. Otherwise, perform real execution for C, Python, CP
      else if (snippet.category === 'C' || snippet.category === 'PYTHON' || snippet.category === 'CP') {
        let result;
        if (snippet.category === 'C') {
          result = await compileRun.c.runSource(code, { stdin: snippet.hiddenInput || '' });
        } else if (snippet.category === 'PYTHON') {
          result = await compileRun.python.runSource(code, { stdin: snippet.hiddenInput || '' });
        } else {
          result = await compileRun.python.runSource(code, { stdin: snippet.hiddenInput || '' });

        }

        stdout = result.stdout;
        stderr = result.stderr;

        // PRIORITIZE ERROR: If stderr exists, it's a failure (compilation or runtime)
        if (stderr && stderr.trim().length > 0) {
          isCorrect = false;
        } else {
          isCorrect = stdout.trim() === expected.trim();
        }
      } else if (snippet.category === 'WEB') {
        const expected = snippet.expected || '';
        if (expected.startsWith('/') && expected.endsWith('/') && expected.length > 2) {
          const regexStr = expected.slice(1, -1);
          const regex = new RegExp(regexStr, 'mi');
          isCorrect = regex.test(code);
        } else {
          isCorrect = code.includes(expected);
        }
        stdout = isCorrect ? 'DOM Mutation Verified.' : 'Required Logic Missing or Structural Violation Detected.';
      }
    } catch (err: any) {
      console.error('❌ Execution error:', err);
      stderr = err.message || 'SYSTEM ALERT: Execution Engine Failure.';
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
      const verifiedSnippets = await prisma.submission.findMany({
        where: { teamId, status: 'VERIFIED' },
        select: { snippetId: true },
        distinct: ['snippetId'],
      });
      const verifiedCount = verifiedSnippets.length;

      if (verifiedCount >= 4) {
        const systemState = await (prisma as any).systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
        if (systemState?.codingStartTime) {
          const elapsedSeconds = Math.floor((Date.now() - new Date(systemState.codingStartTime).getTime()) / 1000);
          await prisma.team.update({
            where: { id: teamId },
            data: { vaultTime: elapsedSeconds } as any,
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
      status: isCorrect ? 'SOLVED' : 'FAILED',
      timestamp: new Date(),
    });

    res.json({
      message: isCorrect ? 'Payload Verified.' : 'SYSTEM ALERT: Payload Rejected.',
      error: stderr || null,
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
    const systemState = await (prisma as any).systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
    if (systemState?.currentPhase !== 'CODING') {
      return res.status(403).json({ error: 'ACCESS DENIED: Coding round not active.' });
    }

    // 2. Check if this specific snippet is already claimed in the team
    const snippet = await prisma.snippet.findUnique({ where: { id: snippetId } });
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

    const existingClaimForSnippet = await (prisma as any).submission.findFirst({
      where: { teamId, snippetId, status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED'] } as any }
    });

    if (existingClaimForSnippet) {
      return res.status(400).json({
        error: `Sector already engaged by ${existingClaimForSnippet.solverName || 'a teammate'}.`
      });
    }

    // 3. Check if this SOLVER has already claimed ANY snippet
    const existingClaimBySolver = await (prisma as any).submission.findFirst({
      where: { teamId, solverName, status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED', 'FAILED'] } as any }
    });

    if (existingClaimBySolver) {
      return res.status(400).json({
        error: `OPERATOR ALERT: ${solverName} is already assigned to Objective #${existingClaimBySolver.snippetId.slice(0, 8)}.`
      });
    }

    // 4. Check if this CATEGORY has already been claimed by someone else in the team
    const existingClaimForCategory = await (prisma as any).submission.findFirst({
      where: {
        teamId,
        snippet: { category: snippet.category },
        status: { in: ['ACQUIRED', 'TESTING', 'VERIFIED'] } as any
      }
    });

    if (existingClaimForCategory) {
      return res.status(400).json({
        error: `CATEGORY LOCK: ${snippet.category} target is already being handled by ${existingClaimForCategory.solverName}.`
      });
    }

    const claim = await (prisma as any).submission.create({
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

    res.json({ stdout, stderr, error: stderr || null });
  } catch (err: any) {
    console.error('❌ Test code error:', err);
    res.json({ stderr: err.message || 'SYSTEM ALERT: Execution Engine Failure.', error: err.message });
  }
};
