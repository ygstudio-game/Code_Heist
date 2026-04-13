import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';
import { resolveAuction, clearInactivityTimer, inactivityDeadlines } from './AuctionController';
import { getIO } from '../config/socket';

// In-memory auction timer store
const auctionTimers: Map<string, NodeJS.Timeout> = new Map();

export const updateAuctionTimer = (auctionId: string, duration: number) => {
  const oldTimer = auctionTimers.get(auctionId);
  if (oldTimer) {
    clearTimeout(oldTimer);
    const newTimer = setTimeout(async () => {
      await resolveAuction(auctionId);
      auctionTimers.delete(auctionId);
    }, duration * 1000);
    auctionTimers.set(auctionId, newTimer);
  }
};

export const clearAuctionTimer = (auctionId: string) => {
  const timer = auctionTimers.get(auctionId);
  if (timer) {
    clearTimeout(timer);
    auctionTimers.delete(auctionId);
  }
};

// ─────────────────────────────────────────────────────────────────────
// SNIPPET MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

export const getAllSnippets = async (req: AuthRequest, res: Response) => {
  try {
    const snippets = await prisma.snippet.findMany({
      include: {
        submissions: {
          select: { id: true, teamId: true, status: true },
        },
        auctionRounds: {
          select: { id: true, status: true, winnerId: true },
        },
      } as any,
      orderBy: { order: 'asc' },
    });
    res.json(snippets);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin logs', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { submissions: true, bids: true }
        },
        members: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch teams', details: error.message });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  const { name, accessKey, password, members } = req.body;

  if (!name || !accessKey || !password) {
    return res.status(400).json({ error: 'Missing name, accessKey, or password' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const team = await prisma.team.create({
      data: {
        name,
        accessKey,
        password: hashedPassword,
        members: {
          create: (members || []).map((m: any) => ({ name: typeof m === 'string' ? m : m.name }))
        }
      },
      include: { members: true }
    });
    res.status(201).json(team);
    getIO().emit('teams:reload');
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create team', details: error.message });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await (prisma as any).team.delete({ where: { id: id as any } });
    res.json({ message: 'Team deleted successfully' });
    getIO().emit('teams:reload');
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete team', details: error.message });
  }
};

export const resetTeamPassword = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.team.update({
      where: { id },
      data: { password: hashedPassword }
    });
    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset password', details: error.message });
  }
};

export const createSnippet = async (req: AuthRequest, res: Response) => {
  const { title, category, buggyCode, solution, hiddenInput, expected, order } = req.body;

  if (!title || !category || !buggyCode || !solution) {
    return res.status(400).json({ error: 'Missing required fields: title, category, buggyCode, solution' });
  }

  try {
    const snippet = await prisma.snippet.create({
      data: { title, category, buggyCode, solution, hiddenInput, expected, order: order || 0 } as any,
    });
    res.status(201).json(snippet);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create snippet', details: error.message });
  }
};

export const updateSnippet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, category, buggyCode, solution, hiddenInput, expected, isActive, order } = req.body;

  try {
    const snippet = await prisma.snippet.update({
      where: { id: id as string },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(buggyCode !== undefined && { buggyCode }),
        ...(solution !== undefined && { solution }),
        ...(hiddenInput !== undefined && { hiddenInput }),
        ...(expected !== undefined && { expected }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });
    res.json(snippet);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update snippet', details: error.message });
  }
};

export const deleteSnippet = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.snippet.delete({ where: { id: id as string } });
    res.json({ message: 'Snippet deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete snippet', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// AUCTION CONTROL
// ─────────────────────────────────────────────────────────────────────

export const startAuction = async (req: AuthRequest, res: Response) => {
  const { snippetId, duration, isPreviewOnly } = req.body;

  if (!snippetId) {
    return res.status(400).json({ error: 'snippetId is required' });
  }

  try {
    // Check no active auction
    const existing = await (prisma as any).auctionRound.findFirst({
      where: { status: { in: ['ACTIVE', 'PREVIEW'] } },
    });
    
    if (existing) {
       // If existing is a preview, we can end it and start a real one or just reject
       if (existing.status === 'PREVIEW' && !isPreviewOnly) {
         console.log(`⏹️ Ending preview ${existing.id} to start real auction`);
         await (prisma as any).auctionRound.update({
            where: { id: existing.id },
            data: { status: 'COMPLETED', winnerId: null }
         });
         clearInactivityTimer(existing.id);
         clearAuctionTimer(existing.id);
       } else {
         return res.status(400).json({ error: 'An auction is already active. End it first.' });
       }
    }

    // Verify snippet exists
    const snippet = await prisma.snippet.findUnique({ where: { id: snippetId } });
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    const auctionDuration = duration || 120;
    const startTime = new Date();
    
    // If it's preview only, we set the status to PENDING or a new status PREVIEW
    // For now, let's use status: ACTIVE and a flag in the socket event
    const endTime = new Date(startTime.getTime() + (isPreviewOnly ? 30 : auctionDuration) * 1000);

    const auction = await (prisma as any).auctionRound.create({
      data: {
        snippetId,
        status: isPreviewOnly ? 'PREVIEW' : 'ACTIVE',
        startTime,
        endTime,
        duration: isPreviewOnly ? 30 : auctionDuration,
      },
      include: { snippet: true },
    });

    // Set up auto-resolve timer
    const timer = setTimeout(async () => {
      if (isPreviewOnly) {
         // After 30s preview, just end it or transition? 
         // PRD says "Admin triggers the 2-minute window" after preview. 
         // So we just close the preview.
          await (prisma as any).auctionRound.update({
            where: { id: auction.id },
            data: { status: 'COMPLETED', winnerId: null } // Mark as completed without winner to clear it
          });
         const io = getIO();
         io.emit('auction:preview-ended', { auctionId: auction.id });
      } else {
        await resolveAuction(auction.id);
      }
      auctionTimers.delete(auction.id);
    }, (isPreviewOnly ? 30 : auctionDuration) * 1000);
    auctionTimers.set(auction.id, timer);

    // Emit Socket.io event
    const io = getIO();
    io.emit('auction:started', {
      auctionId: auction.id,
      snippet: {
        id: snippet.id,
        title: snippet.title,
        category: snippet.category,
        buggyCode: snippet.buggyCode,
      },
      duration: isPreviewOnly ? 30 : auctionDuration,
      endTime: endTime.toISOString(),
      isPreview: !!isPreviewOnly
    });

    res.json({ message: isPreviewOnly ? 'Preview started' : 'Auction started', auction });
  } catch (error: any) {
    console.error('❌ Start auction error:', error);
    res.status(500).json({ error: 'Failed' });
  }
};

export const endAuction = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await (prisma as any).auctionRound.findFirst({
      where: { status: { in: ['ACTIVE', 'PREVIEW'] } },
    });

    if (!auction) {
      return res.status(400).json({ error: 'No active auction to end' });
    }

    // Clear the auto-resolve timer
    const timer = auctionTimers.get(auction.id);
    if (timer) {
      clearTimeout(timer);
      auctionTimers.delete(auction.id);
    }
    // Clear inactivity timer too
    clearInactivityTimer(auction.id);

    const resolved = await resolveAuction(auction.id);
    res.json({ message: 'Auction ended', result: resolved });
  } catch (error: any) {
    console.error('❌ End auction error:', error);
    res.status(500).json({ error: 'Failed to end auction', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// PENALTY / STRIKE SYSTEM
// ─────────────────────────────────────────────────────────────────────

export const applyPenalty = async (req: AuthRequest, res: Response) => {
  const { teamId, strikes, reason, creditPenalty } = req.body;

  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  try {
    const updateData: any = {};
    if (strikes) {
      updateData.strikes = { increment: strikes };
      updateData.lastStrikeAt = new Date();
    }
    if (creditPenalty) {
      updateData.credits = { decrement: creditPenalty };
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
    });

    // Check if team should be eliminated
    if (team.strikes >= 5) {
      await prisma.team.update({
        where: { id: teamId },
        data: { isEliminated: true },
      });
    }

    // Log penalty for history
    await prisma.creditLog.create({
      data: {
        teamId,
        amount: -creditPenalty,
        reason: reason || `System warning/penalty`,
      },
    });

    // Emit Socket.io events
    const io = getIO();
    io.emit('team:penalty', {
      teamId,
      teamName: team.name,
      strikes: team.strikes,
      isEliminated: team.strikes >= 5,
      reason,
    });

    // Also log to admin ticker
    io.to('admin-room').emit('admin:newLog', {
      teamName: team.name,
      problemTitle: reason || 'Violation',
      status: 'WARNING',
      timestamp: new Date(),
    });

    res.json({ message: 'Penalty applied', team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to apply penalty', details: error.message });
  }
};

export const resetStrikes = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { strikes: 0, isEliminated: false, lastStrikeAt: null },
    });
    
    const io = getIO();
    io.emit('team:update', team);
    io.emit('teams:reload');
    
    res.json({ message: 'Strikes reset', team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset strikes', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────────────────────

export const getGameState = async (req: AuthRequest, res: Response) => {
  try {
    const [teams, snippets, activeAuction, submissions, completedAuctions] = await Promise.all([
      prisma.team.findMany({
        where: { role: 'TEAM' },
        select: {
          id: true, name: true, credits: true, strikes: true, isEliminated: true,
          _count: { select: { submissions: true, bids: true } },
        },
        orderBy: { credits: 'desc' },
      }),
      prisma.snippet.count(),
      (prisma as any).auctionRound.findFirst({
        where: { status: { in: ['ACTIVE', 'PREVIEW'] } },
        include: { 
          snippet: { select: { title: true, category: true } },
          bids: {
            include: { team: { select: { name: true } } },
            orderBy: { amount: 'desc' },
          }
        },
      }),
      prisma.submission.groupBy({
        by: ['status'],
        _count: true,
      }),
      (prisma as any).auctionRound.count({ where: { status: 'COMPLETED' } }),
    ]);

    res.json({
      teams,
      totalSnippets: snippets,
      activeAuction: activeAuction ? {
        id: activeAuction.id,
        status: activeAuction.status,
        snippet: activeAuction.snippet,
        endTime: activeAuction.endTime,
        highestBid: activeAuction.bids[0] || null,
        totalBids: activeAuction.bids.length,
        inactivityDeadline: inactivityDeadlines.get(activeAuction.id) || null,
      } : null,
      submissions: submissions.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      completedAuctions,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch game state', details: error.message });
  }
};

export const forceApproveSubmission = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.submission.update({
      where: { id: id as string },
      data: { status: 'VERIFIED', stdout: 'FORCED APPROVAL BY ADMIN' },
    });

    const submission = await prisma.submission.findUnique({
      where: { id: id as string },
      include: { team: { select: { id: true, name: true } }, snippet: { select: { title: true } } }
    });

    if (!submission) return res.status(404).json({ error: 'Submission not found after update' });

    const io = getIO();
    io.to(`team:${submission.teamId}`).emit('submission:update', submission);
    io.to('admin-room').emit('admin:newLog', {
      teamName: submission.team.name,
      problemTitle: submission.snippet.title,
      status: 'APPROVED',
      timestamp: new Date(),
    });

    res.json({ message: 'Submission force approved', submission });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to approve submission' });
  }
};

export const forceRejectSubmission = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.submission.update({
      where: { id: id as string },
      data: { status: 'FAILED', stdout: 'FORCED REJECTION BY ADMIN' },
    });

    const submission = await prisma.submission.findUnique({
      where: { id: id as string },
      include: { team: { select: { id: true, name: true } }, snippet: { select: { title: true } } }
    });

    if (!submission) return res.status(404).json({ error: 'Submission not found after update' });

    const io = getIO();
    io.to(`team:${submission.teamId}`).emit('submission:update', submission);
    
    res.json({ message: 'Submission force rejected', submission });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject submission' });
  }
};

export const releaseProblemClaim = async (req: AuthRequest, res: Response) => {
  const { teamId, snippetId } = req.body;
  try {
    // In this system, "claiming" is reflected by the solverName in Submission.
    // To release it, we delete the latest submission if it's still in TESTING or just reset it.
    await prisma.submission.deleteMany({
      where: { teamId, snippetId, status: { in: ['ACQUIRED', 'TESTING'] } }
    });

    const io = getIO();
    io.to(`team:${teamId}`).emit('claim:released', { snippetId });

    res.json({ message: 'Problem claim released' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to release claim' });
  }
};
export const forceResetSubmission = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const submission = await prisma.submission.update({
      where: { id: id as string },
      data: { status: 'ACQUIRED', stdout: null, stderr: null },
    });
    
    const io = getIO();
    io.to(`team:${submission.teamId}`).emit('submission:update', submission);
    
    res.json({ message: 'Submission reset to ACQUIRED', submission });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset submission' });
  }
};


export const getAllSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        team: { select: { id: true, name: true } },
        snippet: { select: { id: true, title: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

export const getAdminLogs = async (req: AuthRequest, res: Response) => {
  try {
    const [submissions, creditLogs] = await Promise.all([
      prisma.submission.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { 
          team: { select: { name: true } }, 
          snippet: { select: { title: true } } 
        }
      }),
      prisma.creditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { 
          team: { select: { name: true } } 
        }
      })
    ]);

    const logs = [
      ...submissions.map(s => ({
        teamName: s.team.name,
        problemTitle: s.snippet.title,
        status: s.status === 'VERIFIED' ? 'SOLVED' : s.status,
        timestamp: s.createdAt,
        type: 'SUBMISSION'
      })),
      ...creditLogs.map(c => ({
        teamName: c.team.name,
        problemTitle: c.reason,
        status: 'WARNING',
        timestamp: c.createdAt,
        type: 'PENALTY'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const reportViolation = async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason, userName } = req.body;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // We don't increment strikes for tab switches as per user request "no maximum limit"
    // But we still log it to the database and admin ticker
    await prisma.creditLog.create({
      data: {
        teamId,
        amount: 0,
        reason: reason || `Tab Switch Detected (${userName || 'Unknown'})`,
      },
    });

    const io = getIO();
    io.to('admin-room').emit('admin:newLog', {
      teamName: team.name,
      problemTitle: reason || `Tab Switch Detected (${userName || 'Unknown'})`,
      status: 'WARNING',
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report violation' });
  }
};
