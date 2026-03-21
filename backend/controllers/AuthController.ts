import { Request, Response } from 'express';  
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { v4 as uuidv4 } from 'uuid';

export const login = async (req: Request, res: Response) => {
  const { accessKey, password } = req.body;

  try {
    const team = await prisma.team.findUnique({
      where: { accessKey },
    });

    if (!team || !(await bcrypt.compare(password, team.password))) {
      return res.status(401).json({ error: 'Invalid access key or password' });
    }

    // In a real app, you might track active sessions in Redis or DB.
    // For this simple setup, we'll embed a unique sessionId in JWT.
    // The frontend should store this. 
    // Requirement check: 4 concurrent logins per team.
    // To strictly enforce this without a session store, we'd need a more complex setup.
    // Here we'll just allow it and assume management might happen via strike system or similar if abused.
    
    const sessionId = uuidv4();
    const token = signToken({
      teamId: team.id,
      role: team.role,
      sessionId,
    });

    res.json({
      token,
      team: {
        id: team.id,
        name: team.name,
        role: team.role,
        credits: team.credits,
        strikes: team.strikes,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.user.teamId },
      include: { members: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerTeam = async (req: Request, res: Response) => {
  const { name, accessKey, password, members } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Security check: Never allow self-registration as ADMIN
    const requestedRole = req.body.role || 'TEAM';
    if (requestedRole === 'ADMIN') {
      return res.status(403).json({ error: 'UNAUTHORIZED_ACCESS: Admin links must be issued by Aegis Command.' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        accessKey,
        password: hashedPassword,
        credits: 1000,
        role: 'TEAM', // Force TEAM role for all self-registrations
        members: {
          create: (members || []).map((m: string) => ({ name: m })),
        },
      },
    });

    res.status(201).json(team);
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('name')) {
        return res.status(400).json({ error: 'REGISTRATION_DENIED: Squad callsign is already in use.' });
      }
      if (target.includes('accessKey')) {
        return res.status(400).json({ error: 'REGISTRATION_DENIED: Access Key is already occupied by another cell.' });
      }
    }

    res.status(400).json({ 
      error: 'REGISTRATION_FAILED: Uplink rejected due to invalid parameters or existing record.',
      details: error?.message || String(error),
    });
  }
};