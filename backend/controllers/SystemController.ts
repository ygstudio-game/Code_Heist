import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getIO } from '../config/socket';

// In-memory coding timer
let codingTimer: NodeJS.Timeout | null = null;

export const getSystemState = async (req: Request, res: Response) => {
  try {
    const state = await prisma.systemState.upsert({
      where: { id: 'CURRENT_STATE' },
      update: {},
      create: { currentPhase: 'AUCTION' },
    });
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system state' });
  }
};

export const updateSystemPhase = async (req: Request, res: Response) => {
  const { phase } = req.body;
  if (!['AUCTION', 'CODING', 'VAULT', 'FINISHED'].includes(phase)) {
    return res.status(400).json({ error: 'Invalid phase' });
  }

  try {
    const updateData: any = { currentPhase: phase };

    // If transitioning to CODING, record start time and start 60-min timer
    if (phase === 'CODING') {
      updateData.codingStartTime = new Date();

      // Clear any existing coding timer
      if (codingTimer) {
        clearTimeout(codingTimer);
        codingTimer = null;
      }

      // Set 60-minute auto-transition to VAULT
      codingTimer = setTimeout(async () => {
        try {
          await prisma.systemState.update({
            where: { id: 'CURRENT_STATE' },
            data: { currentPhase: 'VAULT' },
          });
          const io = getIO();
          io.emit('system:phase-change', { phase: 'VAULT' });
          console.log('⏰ 60-minute coding timer expired — auto-transitioned to VAULT');
        } catch (err) {
          console.error('Failed to auto-transition to VAULT:', err);
        }
        codingTimer = null;
      }, 60 * 60 * 1000); // 60 minutes
    } else {
      // If leaving CODING phase, clear coding timer and reset start time
      if (codingTimer) {
        clearTimeout(codingTimer);
        codingTimer = null;
      }
      updateData.codingStartTime = null;
    }

    const state = await prisma.systemState.update({
      where: { id: 'CURRENT_STATE' },
      data: updateData,
    });

    // Broadcast change to all clients
    const io = getIO();
    io.emit('system:phase-change', { 
      phase, 
      codingStartTime: (state as any).codingStartTime?.toISOString() || null 
    });

    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system phase' });
  }
};
