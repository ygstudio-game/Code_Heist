'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/api';

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
  joinTeamRoom: (teamId: string) => void;
  joinAuctionRoom: () => void;
}

const SocketContext = createContext<SocketContextData>({
  socket: null,
  isConnected: false,
  joinTeamRoom: () => {},
  joinAuctionRoom: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a token (meaning we are logged in)
    const token = getAuthToken();
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    socketInstance.on('connect', () => {
      console.log('🔗 Connected to Aegis Real-Time Network');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Aegis Network');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinTeamRoom = (teamId: string) => {
    if (socket) {
      socket.emit('join-team', teamId);
    }
  };

  const joinAuctionRoom = () => {
    if (socket) {
      socket.emit('join-auction');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinTeamRoom, joinAuctionRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
