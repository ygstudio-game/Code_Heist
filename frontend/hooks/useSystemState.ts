'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'sonner';

export function useSystemState() {
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
    } catch (error) {
      console.error('Failed to fetch system state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on('system:phase-change', (data: { phase: string; codingStartTime?: string | null }) => {
        setPhase(data.phase);
        if (data.codingStartTime !== undefined) {
          setCodingStartTime(data.codingStartTime);
        }
      });

      return () => {
        socket.off('system:phase-change');
      };
    }
  }, [isConnected, socket]);

  const updatePhase = async (newPhase: string) => {
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
        toast.success(`SYSTEM PHASE TRANSITION: ${newPhase}`);
      } else {
        toast.error('Phase transition failed');
      }
    } catch (error) {
      toast.error('Network error during phase change');
    }
  };

  return { phase, codingStartTime, isLoading, refresh: fetchState, updatePhase };
}
