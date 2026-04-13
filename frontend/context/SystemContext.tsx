'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'sonner';

interface SystemStateContextData {
  phase: string;
  codingStartTime: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updatePhase: (newPhase: string) => Promise<boolean>;
}

const SystemStateContext = createContext<SystemStateContextData | undefined>(undefined);

export const SystemProvider = ({ children }: { children: ReactNode }) => {
  const { socket, isConnected } = useSocket();
  const [phase, setPhase] = useState<string>('AUCTION');
  const [codingStartTime, setCodingStartTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/system/state');
      if (res.ok) {
        const data = await res.json();
        setPhase(data.currentPhase);
        setCodingStartTime(data.codingStartTime || null);
      }
    } catch {
      console.error('Failed to fetch system state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (isConnected && socket) {
      const handlePhaseChange = (data: { phase: string; codingStartTime?: string | null }) => {
        console.log('🔄 System Phase Change received:', data.phase);
        setPhase(data.phase);
        if (data.codingStartTime !== undefined) {
          setCodingStartTime(data.codingStartTime);
        }
        toast.info(`SYSTEM PHASE: ${data.phase}`, {
          style: { background: '#131620', border: '1px solid #00E5FF', color: '#00E5FF' }
        });
      };

      socket.on('system:phase-change', handlePhaseChange);

      return () => {
        socket.off('system:phase-change', handlePhaseChange);
      };
    }
  }, [isConnected, socket]);

  const updatePhase = async (newPhase: string): Promise<boolean> => {
    try {
      const res = await fetchWithAuth('/system/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhase(newPhase);
        setCodingStartTime(data.codingStartTime || null);
        toast.success(`Transitioned to ${newPhase}`);
        return true;
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Phase transition failed');
        return false;
      }
    } catch {
      toast.error('Network error during phase change');
      return false;
    }
  };

  return (
    <SystemStateContext.Provider value={{ phase, codingStartTime, isLoading, refresh: fetchState, updatePhase }}>
      {children}
    </SystemStateContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemStateContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
