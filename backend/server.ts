import 'dotenv/config';
import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initSocket } from './config/socket'; // Ensure relative paths work
import pool from './config/db';
// import authRoutes from './routes/authRoutes'; // Uncomment once file exists

const app: Application = express();
const httpServer = createServer(app);

// 1. Middlewares
app.use(cors());
app.use(express.json());

// 2. Initialize Real-Time Engine
const io = initSocket(httpServer);
app.set('io', io);

// 3. Routes
// app.use('/api/auth', authRoutes);

// 4. Start Sequence
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // First, ensure the vault (DB) is open
        pool.connect((err, client, release) => {
            if (err) {
                console.error('❌ Database Link Failed:', err);
                return;
            }
            console.log('📡 Aegis Terminal: Local PostgreSQL Linked');
            release();
        });
        
        // Then, start the HTTP server (which handles both Express and Sockets)
        httpServer.listen(PORT, () => {
            console.log(`🚀 Aegis Terminal [TS] active on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize Aegis Terminal:', error);
        process.exit(1);
    }
};

startServer();
