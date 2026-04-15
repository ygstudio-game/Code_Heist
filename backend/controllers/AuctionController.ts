import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { canAfford, deductCredits } from './creditsController';
import { getIO } from '../config/socket';
import { updateAuctionTimer, clearAuctionTimer } from './AdminController';

// ─── 15-second inactivity timer store ────────────────────────────────
export const inactivityDeadlines: Map<string, string> = new Map();
const inactivityTimers: Map<string, NodeJS.Timeout> = new Map();

export const clearInactivityTimer = (auctionId: string) => {
  const timer = inactivityTimers.get(auctionId);
  if (timer) {
    clearTimeout(timer);
    inactivityTimers.delete(auctionId);
  }
  inactivityDeadlines.delete(auctionId);
};

// ─── Get the currently active auction round ──────────────────────────
export const getActiveAuction = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await (prisma as any).auctionRound.findFirst({
      where: { status: { in: ['ACTIVE', 'PREVIEW'] } },
      include: {
        snippet: true,
        bids: {
          include: { team: { select: { id: true, name: true } } },
          orderBy: { amount: 'desc' },
        },
      },
    });

    if (!auction) {
      return res.json({ active: false, auction: null });
    }

    // Calculate remaining time
    const now = Date.now();
    const endTime = auction.endTime ? new Date(auction.endTime).getTime() : now;
    const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));

    res.json({
      active: true,
      auction: {
        ...auction,
        isPreview: auction.status === 'PREVIEW',
        timeLeft,
        highestBid: auction.bids[0] || null,
        totalBids: auction.bids.length,
        inactivityDeadline: inactivityDeadlines.get(auction.id) || null,
      },
    });
  } catch (error: any) {
    console.error('❌ Get active auction error:', error);
    res.status(500).json({ error: 'Failed to fetch active auction', details: error.message });
  }
};

// ─── Place a bid on the current auction ──────────────────────────────
export const placeBid = async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  const teamId = req.user?.teamId;

  if (!teamId) return res.status(401).json({ error: 'Unauthorized' });
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bid amount' });
  }

  try {
    // 1. Find active auction
    const auction = await (prisma as any).auctionRound.findFirst({
      where: { status: { in: ['ACTIVE', 'PREVIEW'] } },
      include: {
        snippet: true,
        bids: { orderBy: { amount: 'desc' }, take: 1 },
      },
    });

    if (!auction) {
      return res.status(400).json({ error: 'No active auction to bid on' });
    }
    if (auction.status === 'PREVIEW') {
       return res.status(400).json({ error: 'BIDDING LOCKED: Auction is in preview mode.' });
    }

    // 2. Check timer hasn't expired
    const now = Date.now();
    const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
    if (now >= endTime) {
      return res.status(400).json({ error: 'Auction time has expired' });
    }

    // 2.5. Check 4-problem bidding cap
    const wonCount = await (prisma as any).auctionRound.count({
      where: { winnerId: teamId, status: 'COMPLETED' },
    });
    if (wonCount >= 4) {
      return res.status(400).json({ error: 'BIDDING LOCKED: Your team has already acquired the maximum 4 problems.' });
    }

    // 2.6. Prevent duplicate problem — team must not already own this snippet
    const alreadyOwns = await (prisma as any).auctionRound.findFirst({
      where: {
        snippetId: auction.snippetId,
        winnerId: teamId,
        status: 'COMPLETED',
      },
    });
    if (alreadyOwns) {
      return res.status(400).json({ error: 'BIDDING LOCKED: Your team already owns this problem statement.' });
    }

    // 3. Check minimum bid (1 floor, then +1 increments)
    const currentHighest = auction.bids[0]?.amount || 0;
    const minBid = currentHighest === 0 ? 1 : currentHighest + 1;
    if (amount < minBid) {
      return res.status(400).json({
        error: `Bid must be at least ${minBid} CR`,
      });
    }

    // 4. Get previous bid to calculate effective balance
    const previousBid = await prisma.bid.findFirst({
      where: { teamId, auctionRoundId: auction.id } as any,
      orderBy: { amount: 'desc' },
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { credits: true },
    });
    const currentBalance = team?.credits || 0;
    const effectiveBalance = currentBalance + (previousBid ? previousBid.amount : 0);

    // 5. Check if effective balance covers the amount
    if (amount > effectiveBalance) {
      return res.status(400).json({ error: 'Insufficient credits for this bid' });
    }

    if (previousBid) {
      // Refund the previous bid
      await prisma.team.update({
        where: { id: teamId },
        data: { credits: { increment: previousBid.amount } },
      });
      await prisma.creditLog.create({
        data: {
          teamId,
          amount: previousBid.amount,
          reason: `Bid refund (outbid self in auction ${auction.id})`,
        },
      });
    }

    // 6. Deduct credits and create bid
    await deductCredits(teamId, amount, `Bid on "${auction.snippet?.title || 'snippet'}" auction`);

    const bid = await prisma.bid.create({
      data: {
        teamId,
        snippetId: auction.snippetId,
        auctionRoundId: auction.id,
        amount,
      } as any,
      include: {
        team: { select: { id: true, name: true, credits: true } },
      },
    }) as any;

    // 7. 15-second inactivity auto-close timer
    // Clear any existing inactivity timer, then start a new 15s countdown
    clearInactivityTimer(auction.id);
    const inactivityTimer = setTimeout(async () => {
      console.log(`⏱️ 15s inactivity timeout — auto-resolving auction ${auction.id}`);
      clearAuctionTimer(auction.id); // Clear the outer 2-min hard cap
      await resolveAuction(auction.id);
      inactivityTimers.delete(auction.id);
    }, 15 * 1000);
    inactivityTimers.set(auction.id, inactivityTimer);

    const deadline = new Date(now + 15 * 1000).toISOString();
    inactivityDeadlines.set(auction.id, deadline);

    // 8. Emit Socket.io event
    const io = getIO();
    io.emit('auction:new-bid', {
      bidId: bid.id,
      teamId: bid.teamId,
      amount: bid.amount,
      timestamp: bid.createdAt,
      team: { name: bid.team.name },
      inactivityDeadline: deadline,
    });
    
    // Sync team credits on dashboard
    io.emit('team:update', bid.team);
    io.emit('teams:reload');

    res.json({
      message: 'Bid placed. 15s countdown started.',
      bid,
      newBalance: bid.team.credits,
      inactivityDeadline: deadline,
    });
  } catch (error: any) {
    console.error('❌ Place bid error:', error);
    res.status(500).json({ error: 'Failed to place bid', details: error.message });
  }
};

// ─── Get auction history ─────────────────────────────────────────────
export const getAuctionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const rounds = await (prisma as any).auctionRound.findMany({
      where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
      include: {
        snippet: { select: { id: true, title: true, category: true } },
        winner: { select: { id: true, name: true } },
        bids: {
          include: { team: { select: { id: true, name: true } } },
          orderBy: { amount: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(rounds);
  } catch (error: any) {
    console.error('❌ Auction history error:', error);
    res.status(500).json({ error: 'Failed to fetch auction history' });
  }
};

// ─── Resolve auction (called by timer or admin) ──────────────────────
export const resolveAuction = async (auctionId: string) => {
  try {
    const auction = await (prisma as any).auctionRound.findUnique({
      where: { id: auctionId },
      include: {
        bids: { orderBy: { amount: 'desc' }, take: 1 },
        snippet: true,
      },
    });

    if (!auction || (auction.status !== 'ACTIVE' && auction.status !== 'PREVIEW')) return null;

    // Clear inactivity timer on resolve
    clearInactivityTimer(auctionId);

    const highestBid = auction.bids[0];

    if (highestBid) {
      // Mark bid as won
      await prisma.bid.update({
        where: { id: highestBid.id },
        data: { won: true },
      });

      // Mark auction as completed with winner
      const resolved = await (prisma as any).auctionRound.update({
        where: { id: auctionId },
        data: {
          status: 'COMPLETED',
          winnerId: highestBid.teamId,
          winningBid: highestBid.amount,
        },
        include: {
          winner: { select: { id: true, name: true } },
          snippet: { select: { id: true, title: true, category: true } },
        },
      });

      // Refund all losing bids
      const losingBids = await prisma.bid.findMany({
        where: {
          auctionRoundId: auctionId,
          id: { not: highestBid.id },
        } as any,
      });

      for (const bid of losingBids) {
        await prisma.team.update({
          where: { id: bid.teamId },
          data: { credits: { increment: bid.amount } },
        });
        await prisma.creditLog.create({
          data: {
            teamId: bid.teamId,
            amount: bid.amount,
            reason: `Bid refund — lost auction for "${auction.snippet?.title}"`,
          },
        });
      }

      // Emit Socket.io event
      const io = getIO();
      io.emit('auction:ended', {
        auctionId,
        winner: resolved.winner,
        winningBid: resolved.winningBid,
        snippet: resolved.snippet,
      });
      
      io.emit('teams:reload');
      if (resolved.winner) {
         io.emit('team:update', resolved.winner);
      }

      return resolved;
    } else {
      // No bids — cancel auction
      const cancelled = await (prisma as any).auctionRound.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED' },
      });

      const io = getIO();
      io.emit('auction:ended', {
        auctionId,
        winner: null,
        winningBid: 0,
        snippet: auction.snippet,
        cancelled: true,
      });

      return cancelled;
    }
  } catch (error) {
    console.error('❌ Resolve auction error:', error);
    return null;
  }
};
