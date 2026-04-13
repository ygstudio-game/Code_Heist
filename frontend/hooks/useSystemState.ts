'use client';

import { useSystem } from '../context/SystemContext';

export function useSystemState() {
  const { phase, codingStartTime, isLoading, refresh, updatePhase } = useSystem();

  return { 
    phase, 
    codingStartTime, 
    isLoading, 
    refresh, 
    updatePhase 
  };
}
