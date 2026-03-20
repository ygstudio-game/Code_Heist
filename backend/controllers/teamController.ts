import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
      },
      orderBy: {
        credits: 'desc',
      },
    });

    // Remove sensitive data (like password) before sending
    const safeTeams = teams.map(t => {
      const { password, ...safeTeam } = t;
      return safeTeam;
    });

    res.json(safeTeams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

export const getTeamById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const team = await prisma.team.findUnique({
      where: { id: id as string },
      include: {
        members: true,
        creditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { password, ...safeTeam } = team;
    res.json(safeTeam);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
