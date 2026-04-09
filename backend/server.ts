import 'dotenv/config';
import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initSocket } from './config/socket';
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

// 4. Start Sequence
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Initialize System State if not exists
        await prisma.systemState.upsert({
            where: { id: 'CURRENT_STATE' },
            update: {},
            create: { currentPhase: 'AUCTION' },
        });

        httpServer.listen(PORT, () => {
            console.log(`🚀 Aegis Terminal [TS] active on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize Aegis Terminal:', error);
        process.exit(1);
    }
};

startServer();
