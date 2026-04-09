'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';
import {
  Timer,
  Play,
  Square,
  Lock,
  HeartPulse,
  CheckCircle,
  Skull,
  AlertTriangle,
} from 'lucide-react';

interface VaultTeam {
  id: string;
  name: string;
  isEliminated: boolean;
  vaultTime: number;
  lifelinesUsed: number;
  lockPenalties: number;
  totalTime: number;
  hasCompleted: boolean;
}

interface VaultState {
  activeSessions: { teamId: string; startTime: number }[];
  teams: VaultTeam[];
}

function formatTimePrecise(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TeamVaultPage() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);
  const { socket, isConnected } = useSocket();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // We'll determine "my team" by finding the team in the list that isn't an admin (or we can use a dedicated /me endpoint if available, but /vault/state returns all teams so we can filter)
  // Actually, fetchWithAuth will provide the token, but we need to know WHICH team we are.
  // Assuming the backend returns the current team's data or we can find it.
  
  const loadVaultState = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/vault/state');
      if (res.ok) {
        const data = await res.json();
        setVaultState(data);
      }
    } catch (error) {
      console.error('Failed to load vault state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVaultState();
  }, [loadVaultState]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!isConnected || !socket) return;

    const reload = () => loadVaultState();
    socket.on('vault:timer-started', reload);
    socket.on('vault:timer-stopped', reload);
    socket.on('vault:time-synced', reload);
    socket.on('vault:lifeline-used', reload);
    socket.on('vault:lock-penalty', reload);
    socket.on('vault:team-eliminated', reload);
    socket.on('vault:team-reset', reload);

    return () => {
      socket.off('vault:timer-started', reload);
      socket.off('vault:timer-stopped', reload);
      socket.off('vault:time-synced', reload);
      socket.off('vault:lifeline-used', reload);
      socket.off('vault:lock-penalty', reload);
      socket.off('vault:team-eliminated', reload);
      socket.off('vault:team-reset', reload);
    };
  }, [isConnected, socket, loadVaultState]);

  // Find "My Team" (The one that matches the active session if we are active, or we might need a way to identify 'self')
  // For now, I'll assume only one team starts their own timer at a time, but to be sure, I'll need 'me'
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetchWithAuth('/teams/me'); // Assuming this exists based on typical patterns
        if (res.ok) {
          const data = await res.json();
          setMyTeamId(data.id);
        }
      } catch (err) {
        console.error("Failed to fetch 'me'", err);
      }
    };
    fetchMe();
  }, []);

  const myTeam = vaultState?.teams.find(t => t.id === myTeamId);
  const myActiveSession = vaultState?.activeSessions.find(s => s.teamId === myTeamId);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth('/vault/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: myTeamId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Vault timer started! Good luck.");
        loadVaultState();
      } else {
        toast.error(data.error || "Failed to start timer");
      }
    } catch (err) {
      toast.error("Network error starting timer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth('/vault/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: myTeamId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Vault completed!");
        loadVaultState();
      } else {
        toast.error(data.error || "Failed to stop timer");
      }
    } catch (err) {
      toast.error("Network error stopping timer");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30">
      <div className="scanline"></div>
      <Navbar />

      <main className="max-w-4xl mx-auto p-6 md:p-10 pt-32 grid-bg-subtle min-h-screen">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase mb-2">
            Round 2 // Physical Challenge
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            Vault <span className="text-white/20">Access</span>
          </h1>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !myTeam ? (
          <div className="terminal-card border-danger/20 text-center py-12">
            <AlertTriangle className="mx-auto text-danger mb-4" size={48} />
            <h2 className="text-xl font-bold uppercase text-danger mb-2">Unauthorized</h2>
            <p className="text-text/40 text-sm">Please login as a team to access vault controls.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Card */}
            <div className="terminal-card border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                    {myTeam.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${myActiveSession ? 'bg-primary animate-pulse' : myTeam.hasCompleted ? 'bg-success' : 'bg-white/20'}`}></div>
                    <span className="text-[10px] text-text/40 uppercase tracking-[2px] font-bold">
                      {myActiveSession ? 'IN PROGRESS' : myTeam.hasCompleted ? 'COMPLETED' : 'WAITING'}
                    </span>
                  </div>
                </div>

                {myTeam.isEliminated && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/30 text-danger rounded-sm">
                    <Skull size={18} />
                    <span className="font-bold uppercase text-xs tracking-widest">Eliminated</span>
                  </div>
                )}
              </div>

              {/* LIVE TIMER */}
              <div className="bg-black/40 border border-white/5 rounded-sm p-10 text-center mb-8">
                <div className="text-[10px] text-text/30 uppercase tracking-[4px] mb-4">
                  {myActiveSession ? 'LIVE VAULT TIMER' : 'READY TO START'}
                </div>
                <div className={`text-7xl md:text-8xl font-black font-geist-mono tracking-tighter tabular-nums ${myActiveSession ? 'text-primary' : 'text-white/10'}`}>
                  {myActiveSession ? formatTimePrecise(now - myActiveSession.startTime) : '00:00'}
                </div>
              </div>

              {/* CONTROLS */}
              {!myTeam.hasCompleted && !myTeam.isEliminated && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleStart}
                    disabled={actionLoading || !!myActiveSession}
                    className="flex items-center justify-center gap-3 py-6 bg-success/10 border border-success/30 text-success font-black text-sm uppercase tracking-[4px] hover:bg-success/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Play size={20} />
                    Start Timer
                  </button>
                  <button
                    onClick={handleStop}
                    disabled={actionLoading || !myActiveSession}
                    className="flex items-center justify-center gap-3 py-6 bg-danger/10 border border-danger/30 text-danger font-black text-sm uppercase tracking-[4px] hover:bg-danger/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Square size={20} />
                    Stop Timer
                  </button>
                </div>
              )}

              {myTeam.hasCompleted && !myTeam.isEliminated && (
                <div className="p-6 bg-success/5 border border-success/20 rounded-sm text-center">
                  <CheckCircle className="mx-auto text-success mb-3" size={32} />
                  <h3 className="text-lg font-bold uppercase text-success mb-1">Vault Completed</h3>
                  <p className="text-text/40 text-xs uppercase tracking-widest">
                    Time: {Math.floor(myTeam.vaultTime / 60)}m {myTeam.vaultTime % 60}s
                  </p>
                </div>
              )}
            </div>

            {/* Stats Check */}
            <div className="grid grid-cols-2 gap-6">
              <div className="terminal-card border-white/5 px-6 py-4">
                <div className="text-[9px] text-text/30 uppercase tracking-widest mb-1">Lifelines Used</div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {[0,1,2].map(i => (
                      <HeartPulse key={i} size={16} className={i < myTeam.lifelinesUsed ? 'text-danger' : 'text-white/10'} />
                    ))}
                  </div>
                  <span className="text-xl font-black text-white">{myTeam.lifelinesUsed}/3</span>
                </div>
              </div>
              <div className="terminal-card border-white/5 px-6 py-4">
                <div className="text-[9px] text-text/30 uppercase tracking-widest mb-1">Lock Penalties</div>
                <div className="flex items-center justify-between">
                  <Lock size={16} className={myTeam.lockPenalties > 0 ? 'text-warning' : 'text-white/10'} />
                  <span className="text-xl font-black text-white">{myTeam.lockPenalties}</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-text/20 uppercase tracking-widest text-center mt-8">
              Admin is monitoring all sessions. Synchronization will be updated after physical verification.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
