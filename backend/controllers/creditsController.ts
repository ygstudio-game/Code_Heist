import { Request, Response } from 'express';  
import prisma from '../lib/prisma';

export const getCredits = async (req: any, res: Response) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.user.teamId },
      select: { credits: true },
    });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
};

export const canAfford = async (teamId: string, amount: number) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { credits: true },
  });
  return (team?.credits || 0) >= amount;
};

export const deductCredits = async (teamId: string, amount: number, reason: string) => {
  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id: teamId },
      data: {
        credits: { decrement: amount },
      },
    });

    await tx.creditLog.create({
      data: {
        teamId,
        amount: -amount,
        reason,
      },
    });

    return team;
  });
};

export const adminAdjustCredits = async (req: Request, res: Response) => {
  const { teamId, amount, reason } = req.body;
  try {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        credits: { increment: amount },
      },
    });

    await prisma.creditLog.create({
      data: { teamId, amount, reason },
    });

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust credits' });
  }
};