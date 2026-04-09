import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { getIO } from '../config/socket';

// ─────────────────────────────────────────────────────────────────────
// IN-MEMORY VAULT TIMERS
// Track which teams are currently in the vault and their start times
// ─────────────────────────────────────────────────────────────────────
// Map<teamId, startTimeEpochMs>
const activeVaultSessions: Map<string, number> = new Map();

// ─────────────────────────────────────────────────────────────────────
// GET VAULT STATE (Public — shows leaderboard + all active sessions)
// ─────────────────────────────────────────────────────────────────────
export const getVaultState = async (req: Request, res: Response) => {
  try {
    // Get all teams with vault data
    const teams = await prisma.team.findMany({
      where: { role: 'TEAM' },
      select: {
        id: true,
        name: true,
        isEliminated: true,
        vaultTime: true,
        lifelinesUsed: true,
        lockPenalties: true,
      },
      orderBy: { name: 'asc' },
    });

    // Calculate final ranking data for each team
    const rankedTeams = teams.map((team) => {
      const LIFELINE_PENALTY_SECONDS = 180; // 3 min per lifeline
      const LOCK_PENALTY_SECONDS = 60;      // 1 min per incorrect lock

      const vaultTimeSeconds = team.vaultTime || 0;
      const lifelinePenalty = team.lifelinesUsed * LIFELINE_PENALTY_SECONDS;
      const lockPenalty = team.lockPenalties * LOCK_PENALTY_SECONDS;
      const totalTime = vaultTimeSeconds + lifelinePenalty + lockPenalty;

      return {
        id: team.id,
        name: team.name,
        isEliminated: team.isEliminated,
        vaultTime: vaultTimeSeconds,
        lifelinesUsed: team.lifelinesUsed,
        lockPenalties: team.lockPenalties,
        lifelinePenalty,
        lockPenalty,
        totalTime,
        hasCompleted: vaultTimeSeconds > 0,
      };
    });

    // Sort: completed teams first (by totalTime ascending), then incomplete
    rankedTeams.sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      if (a.hasCompleted && !b.hasCompleted) return -1;
      if (!a.hasCompleted && b.hasCompleted) return 1;
      return a.totalTime - b.totalTime;
    });

    // Convert sessions map to array for frontend
    const sessions = Array.from(activeVaultSessions.entries()).map(([teamId, startTime]) => ({
      teamId,
      startTime,
    }));

    res.json({
      activeSessions: sessions,
      teams: rankedTeams,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch vault state', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// START VAULT TIMER (Admin or Team)
// ─────────────────────────────────────────────────────────────────────
export const startVaultTimer = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;
  const requestId = req.user?.teamId;
  const isAdmin = req.user?.role === 'ADMIN';

  const targetTeamId = teamId || requestId; // if teamId not provided, assume requester is the team

  if (!targetTeamId) return res.status(400).json({ error: 'target teamId could not be determined' });

  // Safety check: if not admin, can only start own timer
  if (!isAdmin && targetTeamId !== requestId) {
    return res.status(403).json({ error: 'Unauthorized: Teams can only start their own timer' });
  }

  try {
    const team = await prisma.team.findUnique({ where: { id: targetTeamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.isEliminated) return res.status(400).json({ error: 'Team is eliminated' });
    if (activeVaultSessions.has(targetTeamId)) {
      return res.status(400).json({ error: 'Timer is already running for this team' });
    }

    const startTime = Date.now();
    activeVaultSessions.set(targetTeamId, startTime);

    // Broadcast to all clients
    const io = getIO();
    io.emit('vault:timer-started', {
      teamId: targetTeamId,
      teamName: team.name,
      startTime,
    });

    res.json({ message: 'Vault timer started', teamId: targetTeamId, startTime });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to start vault timer', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// STOP VAULT TIMER (Admin or Team)
// ─────────────────────────────────────────────────────────────────────
export const stopVaultTimer = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;
  const requestId = req.user?.teamId;
  const isAdmin = req.user?.role === 'ADMIN';

  const targetTeamId = teamId || requestId;

  if (!targetTeamId) return res.status(400).json({ error: 'target teamId could not be determined' });

  if (!isAdmin && targetTeamId !== requestId) {
    return res.status(403).json({ error: 'Unauthorized: Teams can only stop their own timer' });
  }

  const startTime = activeVaultSessions.get(targetTeamId);
  if (!startTime) {
    return res.status(400).json({ error: 'No active timer found for this team' });
  }

  try {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Save to DB
    const team = await prisma.team.update({
      where: { id: targetTeamId },
      data: { vaultTime: elapsedSeconds }
    });

    // Remove from active sessions
    activeVaultSessions.delete(targetTeamId);

    const io = getIO();
    io.emit('vault:timer-stopped', { 
      teamId: targetTeamId, 
      teamName: team.name, 
      vaultTime: elapsedSeconds 
    });

    res.json({ message: 'Vault timer stopped and saved', teamId: targetTeamId, vaultTime: elapsedSeconds });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to stop vault timer', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// SYNC VAULT TIME (Admin — override web timer with physical timer)
// ─────────────────────────────────────────────────────────────────────
export const syncVaultTime = async (req: AuthRequest, res: Response) => {
  const { teamId, vaultTimeSeconds } = req.body;

  if (!teamId) return res.status(400).json({ error: 'teamId is required' });
  if (vaultTimeSeconds === undefined || vaultTimeSeconds < 0) {
    return res.status(400).json({ error: 'Valid vaultTimeSeconds is required' });
  }

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { vaultTime: Math.round(vaultTimeSeconds) },
    });

    // Clear active session if this team was active
    activeVaultSessions.delete(teamId);

    const io = getIO();
    io.emit('vault:time-synced', {
      teamId,
      teamName: team.name,
      vaultTime: team.vaultTime,
    });

    res.json({ message: 'Vault time synced', team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sync vault time', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// LOG LIFELINE USED (Admin)
// ─────────────────────────────────────────────────────────────────────
export const logLifeline = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { lifelinesUsed: { increment: 1 } },
    });

    // Auto-eliminate if 3 lifelines used
    if (team.lifelinesUsed >= 3) {
      await prisma.team.update({
        where: { id: teamId },
        data: { isEliminated: true },
      });

      // Clear active session if this team was active
      activeVaultSessions.delete(teamId);

      const io = getIO();
      io.emit('vault:team-eliminated', {
        teamId,
        teamName: team.name,
        reason: 'Used all 3 lifelines',
      });

      return res.json({
        message: 'Team eliminated — all 3 lifelines used',
        team: { ...team, isEliminated: true },
        eliminated: true,
      });
    }

    const io = getIO();
    io.emit('vault:lifeline-used', {
      teamId,
      teamName: team.name,
      lifelinesUsed: team.lifelinesUsed,
      remaining: 3 - team.lifelinesUsed,
    });

    res.json({ message: 'Lifeline logged', team, eliminated: false });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to log lifeline', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// LOG INCORRECT LOCK ATTEMPT (Admin)
// ─────────────────────────────────────────────────────────────────────
export const logLockPenalty = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { lockPenalties: { increment: 1 } },
    });

    const io = getIO();
    io.emit('vault:lock-penalty', {
      teamId,
      teamName: team.name,
      lockPenalties: team.lockPenalties,
    });

    res.json({ message: 'Lock penalty logged', team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to log lock penalty', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// RESET VAULT DATA FOR A TEAM (Admin)
// ─────────────────────────────────────────────────────────────────────
export const resetVaultData = async (req: AuthRequest, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        vaultTime: 0,
        lifelinesUsed: 0,
        lockPenalties: 0,
        isEliminated: false,
      },
    });

    activeVaultSessions.delete(teamId);

    const io = getIO();
    io.emit('vault:team-reset', { teamId, teamName: team.name });

    res.json({ message: 'Vault data reset', team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset vault data', details: error.message });
  }
};
