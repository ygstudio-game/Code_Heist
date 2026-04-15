import 'dotenv/config';
import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initSocket, getIO } from './config/socket';
import pool from './config/db';
import authRoutes from './routes/authRoutes';
import creditsRoutes from './routes/creditsRoutes';
import teamRoutes from './routes/teamRoutes';
import codeRoutes from './routes/codeRoutes';
import auctionRoutes from './routes/auctionRoutes';
import adminRoutes from './routes/adminRoutes';
import systemRoutes from './routes/systemRoutes';
import vaultRoutes from './routes/vaultRoutes';
import prisma from './lib/prisma';

const app: Application = express();
const httpServer = createServer(app);

// 1. Middlewares
app.use(cors());
app.use(express.json());

// Request Logger - see every API call in your terminal
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`, req.method === 'POST' ? JSON.stringify(req.body) : '');
    next();
});

// 2. Initialize Real-Time Engine
const io = initSocket(httpServer);
app.set('io', io);

// 3. Routes
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/health', (req, res) => {
    res.json({ message: 'OK' });
});
// 4. Start Sequence
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Ensure global system state exists
        const state = await (prisma as any).systemState.findUnique({
            where: { id: 'CURRENT_STATE' }
        });

        if (!state) {
            await (prisma as any).systemState.create({
                data: { id: 'CURRENT_STATE', currentPhase: 'AUCTION' }
            });
            console.log('🏁 System State Initialized: AUCTION');
        }
        const currentState = await (prisma as any).systemState.findUnique({ where: { id: 'CURRENT_STATE' } });
        if (currentState?.currentPhase === 'CODING' && (currentState as any).codingStartTime) {
            const elapsed = Date.now() - new Date((currentState as any).codingStartTime).getTime();
            const remaining = (60 * 60 * 1000) - elapsed;

            if (remaining > 0) {
                // We need to import the timer logic or expose it from SystemController
                // For simplicity, let's just trigger a logic block here
                console.log(`⏰ Resuming coding timer. ${Math.floor(remaining / 1000 / 60)}m remaining.`);
                setTimeout(async () => {
                    await (prisma as any).systemState.update({
                        where: { id: 'CURRENT_STATE' },
                        data: { currentPhase: 'VAULT' },
                    });
                    const io = getIO();
                    io.emit('system:phase-change', { phase: 'VAULT' });
                }, remaining);
            } else {
                // Timer expired while server was offline
                await (prisma as any).systemState.update({
                    where: { id: 'CURRENT_STATE' },
                    data: { currentPhase: 'VAULT' },
                });
            }
        }

        httpServer.listen(PORT, () => {
            console.log(`🚀 Aegis Terminal [TS] active on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize Aegis Terminal:', error);
        process.exit(1);
    }
};

startServer();
