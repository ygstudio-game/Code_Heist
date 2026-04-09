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
  Upload,
  HeartPulse,
  Lock,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Skull,
  Clock,
  Shield,
} from 'lucide-react';

interface VaultTeam {
  id: string;
  name: string;
  isEliminated: boolean;
  vaultTime: number;
  lifelinesUsed: number;
  lockPenalties: number;
  lifelinePenalty: number;
  lockPenalty: number;
  totalTime: number;
  hasCompleted: boolean;
}

interface VaultState {
  activeSessions: { teamId: string; startTime: number }[];
  teams: VaultTeam[];
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimePrecise(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function AdminVaultPage() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [syncMinutes, setSyncMinutes] = useState('');
  const [syncSeconds, setSyncSeconds] = useState('');
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Global ticker for all stopwatches
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

  const apiAction = async (endpoint: string, body: any, label: string) => {
    setActionLoading(label);
    try {
      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${label} successful`);
        if (data.eliminated) {
          toast.error(`⚠️ TEAM ELIMINATED — All 3 lifelines used!`);
        }
        await loadVaultState();
      } else {
        toast.error(data.error || `${label} failed`);
      }
    } catch (error) {
      toast.error(`Network error: ${label}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTimer = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    apiAction('/vault/start', { teamId: selectedTeamId }, 'Start Timer');
  };

  const handleStopTimer = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    apiAction('/vault/stop', { teamId: selectedTeamId }, 'Stop Timer');
  };

  const handleSyncTime = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    const totalSecs = (parseInt(syncMinutes || '0') * 60) + parseInt(syncSeconds || '0');
    if (totalSecs <= 0) return toast.error('Enter a valid time');
    apiAction('/vault/sync', { teamId: selectedTeamId, vaultTimeSeconds: totalSecs }, 'Sync Time');
    setSyncMinutes('');
    setSyncSeconds('');
  };

  const handleLogLifeline = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    apiAction('/vault/lifeline', { teamId: selectedTeamId }, 'Log Lifeline');
  };

  const handleLogLockPenalty = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    apiAction('/vault/penalty', { teamId: selectedTeamId }, 'Log Lock Penalty');
  };

  const handleResetTeam = () => {
    if (!selectedTeamId) return toast.error('Select a team first');
    apiAction('/vault/reset', { teamId: selectedTeamId }, 'Reset Team');
  };

  const selectedTeam = vaultState?.teams.find((t) => t.id === selectedTeamId);
  const activeSessionForSelected = vaultState?.activeSessions.find(s => s.teamId === selectedTeamId);

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-10 pt-32 grid-bg-subtle min-h-screen">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase mb-2">
            <Shield size={12} />
            Admin Control // Vault Phase
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            Vault <span className="text-white/20">Control Panel</span>
          </h1>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ─── LEFT: Team Selector ─── */}
            <div className="lg:col-span-1 space-y-4">
              <div className="terminal-card border-white/5">
                <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-4">
                  Select Team
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {vaultState?.teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 border rounded-sm transition-all text-left ${
                        selectedTeamId === team.id
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-white/[0.02] border-white/5 text-text/60 hover:border-white/15 hover:bg-white/[0.04]'
                      } ${team.isEliminated ? 'opacity-40 grayscale' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            team.isEliminated
                              ? 'bg-danger'
                              : vaultState?.activeSessions.some(s => s.teamId === team.id)
                              ? 'bg-primary animate-pulse'
                              : team.hasCompleted
                              ? 'bg-success'
                              : 'bg-white/20'
                          }`}
                        ></div>
                        <span className="text-sm font-bold uppercase">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.isEliminated && <Skull size={12} className="text-danger" />}
                        {team.hasCompleted && !team.isEliminated && (
                          <CheckCircle size={12} className="text-success" />
                        )}
                        {vaultState?.activeSessions.some(s => s.teamId === team.id) && (
                          <Timer size={12} className="text-primary animate-pulse" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Team Info */}
              {selectedTeam && (
                <div className="terminal-card border-white/5">
                  <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-4">
                    Team Details
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-text/30 uppercase tracking-widest">Status</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 border rounded-sm ${
                          selectedTeam.isEliminated
                            ? 'bg-danger/10 border-danger/30 text-danger'
                            : selectedTeam.hasCompleted
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-white/5 border-white/10 text-text/50'
                        }`}
                      >
                        {selectedTeam.isEliminated ? 'Eliminated' : selectedTeam.hasCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-text/30 uppercase tracking-widest">Vault Time</span>
                      <span className="text-sm font-geist-mono text-text/70">
                        {selectedTeam.hasCompleted ? formatTime(selectedTeam.vaultTime) : '--:--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-text/30 uppercase tracking-widest">Lifelines</span>
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <HeartPulse
                            key={i}
                            size={14}
                            className={i < selectedTeam.lifelinesUsed ? 'text-danger' : 'text-success/50'}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-text/30 uppercase tracking-widest">Lock Errors</span>
                      <span className="text-sm font-bold text-warning">{selectedTeam.lockPenalties}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-3 mt-3">
                      <span className="text-[10px] text-text/30 uppercase tracking-widest">Total Time</span>
                      <span className="text-sm font-black text-primary">
                        {selectedTeam.hasCompleted ? formatTime(selectedTeam.totalTime) : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── RIGHT: Controls ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live Stopwatch for Selected Team */}
              {activeSessionForSelected && selectedTeam && (
                <div className="terminal-card border-primary/20">
                  <div className="flex items-center gap-2 text-primary text-[10px] uppercase tracking-[3px] font-bold mb-4">
                    <Timer size={14} className="animate-pulse" />
                    Live Timer — {selectedTeam.name}
                  </div>
                  <div className="text-5xl font-black text-primary glow-text font-geist-mono tracking-tighter tabular-nums text-center py-4">
                    {formatTimePrecise(now - activeSessionForSelected.startTime)}
                  </div>
                </div>
              )}

              {/* Timer Controls */}
              <div className="terminal-card border-white/5">
                <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-6">
                  Timer Controls
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleStartTimer}
                    disabled={!!actionLoading || !!activeSessionForSelected || !selectedTeamId || selectedTeam?.isEliminated}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-success/10 border border-success/30 text-success font-bold text-xs uppercase tracking-widest hover:bg-success/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Play size={16} />
                    Start Timer
                  </button>
                  <button
                    onClick={handleStopTimer}
                    disabled={!!actionLoading || !activeSessionForSelected}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-danger/10 border border-danger/30 text-danger font-bold text-xs uppercase tracking-widest hover:bg-danger/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Square size={16} />
                    Stop Timer
                  </button>
                </div>
              </div>

              {/* Physical Timer Sync */}
              <div className="terminal-card border-white/5">
                <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-4">
                  Sync Physical Timer
                </div>
                <p className="text-text/30 text-[11px] mb-4">
                  Read the physical timer inside the vault box. Enter the exact time below to override the web timer.
                </p>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-[9px] text-text/30 uppercase tracking-widest mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={syncMinutes}
                      onChange={(e) => setSyncMinutes(e.target.value)}
                      placeholder="00"
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white font-geist-mono text-lg text-center focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <span className="text-2xl text-text/20 font-bold pb-3">:</span>
                  <div className="flex-1">
                    <label className="block text-[9px] text-text/30 uppercase tracking-widest mb-1">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={syncSeconds}
                      onChange={(e) => setSyncSeconds(e.target.value)}
                      placeholder="00"
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white font-geist-mono text-lg text-center focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <button
                    onClick={handleSyncTime}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/30 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-30"
                  >
                    <Upload size={14} />
                    Sync
                  </button>
                </div>
              </div>

              {/* Lifeline & Penalty Logging */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="terminal-card border-white/5">
                  <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-4">
                    Lifeline Tracking
                  </div>
                  <p className="text-text/30 text-[11px] mb-4">
                    Each lifeline adds +3 min penalty. At 3 lifelines the team is eliminated.
                  </p>
                  <button
                    onClick={handleLogLifeline}
                    disabled={!!actionLoading || !selectedTeamId}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-warning/10 border border-warning/30 text-warning font-bold text-xs uppercase tracking-widest hover:bg-warning/20 transition-all disabled:opacity-30"
                  >
                    <HeartPulse size={16} />
                    Log Lifeline Used (+3 min)
                  </button>
                </div>

                <div className="terminal-card border-white/5">
                  <div className="text-[10px] uppercase tracking-[3px] text-text/40 font-bold mb-4">
                    Lock Attempt Penalty
                  </div>
                  <p className="text-text/30 text-[11px] mb-4">
                    Each incorrect lock attempt adds +1 min penalty to the total time.
                  </p>
                  <button
                    onClick={handleLogLockPenalty}
                    disabled={!!actionLoading || !selectedTeamId}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-danger/10 border border-danger/30 text-danger font-bold text-xs uppercase tracking-widest hover:bg-danger/20 transition-all disabled:opacity-30"
                  >
                    <Lock size={16} />
                    Log Incorrect Attempt (+1 min)
                  </button>
                </div>
              </div>

              {/* Reset */}
              <div className="terminal-card border-danger/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[3px] text-danger/60 font-bold mb-1">
                      Danger Zone
                    </div>
                    <p className="text-text/30 text-[11px]">
                      Reset all vault data for the selected team (time, lifelines, penalties, elimination flag).
                    </p>
                  </div>
                  <button
                    onClick={handleResetTeam}
                    disabled={!!actionLoading || !selectedTeamId}
                    className="flex items-center gap-2 px-5 py-3 bg-danger/10 border border-danger/30 text-danger font-bold text-xs uppercase tracking-widest hover:bg-danger/20 transition-all disabled:opacity-30 shrink-0"
                  >
                    <RotateCcw size={14} />
                    Reset Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
