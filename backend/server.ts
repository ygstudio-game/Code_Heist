import 'dotenv/config';
import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import connectDB from '#config/db';
import { initSocket } from '#config/socket';

const app: Application = express();
const httpServer = createServer(app);

// 1. Connect to Database
connectDB();

// 2. Initialize Real-Time Engine
const io = initSocket(httpServer);

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Global Access (Optional, but useful for controllers)
app.set('io', io);

// 5. Routes (To be added)
// app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Aegis Terminal [TS] active on port ${PORT}`);
});