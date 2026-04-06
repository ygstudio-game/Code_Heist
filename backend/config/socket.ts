import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:3001"],
            methods: ["GET", "POST"],
        },
    });

    io.on('connection', (socket) => {
        console.log(`⚡ Session Active: ${socket.id}`);

        // Join team-specific room
        socket.on('join-team', (teamId: string) => {
            socket.join(`team:${teamId}`);
            console.log(`🔗 Socket ${socket.id} joined team:${teamId}`);
        });

        // Join auction room
        socket.on('join-auction', () => {
            socket.join('auction');
            console.log(`🎯 Socket ${socket.id} joined auction room`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Session Terminated: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};