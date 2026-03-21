import 'dotenv/config';
import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initSocket } from './config/socket'; // Ensure relative paths work
import pool from './config/db';
import authRoutes from './routes/authRoutes';
import creditsRoutes from './routes/creditsRoutes';
import teamRoutes from './routes/teamRoutes';
import codeRoutes from './routes/codeRoutes';

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

// 4. Start Sequence
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        httpServer.listen(PORT, () => {
            console.log(`🚀 Aegis Terminal [TS] active on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize Aegis Terminal:', error);
        process.exit(1);
    }
};

startServer();
