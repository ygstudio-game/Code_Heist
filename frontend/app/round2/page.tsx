'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import Navbar from '@/components/Navbar';
import { Timer, Trophy, Shield, AlertTriangle, Lock, Unlock, Zap, Clock, Skull, HeartPulse } from 'lucide-react';

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

export default function Round2Page() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
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
    socket.on('vault:timer-stopped', (data) => {
      reload();
      toast.success(`Team ${data.teamName} completed the vault in ${formatTime(data.vaultTime)}!`);
    });
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

  const getActiveTeam = (teamId: string) => vaultState?.teams.find(t => t.id === teamId);
  const completedTeams = vaultState?.teams.filter((t) => t.hasCompleted && !t.isEliminated) || [];
  const eliminatedTeams = vaultState?.teams.filter((t) => t.isEliminated) || [];
  
  const activeTeamIds = new Set(vaultState?.activeSessions.map(s => s.teamId) || []);
  const pendingTeams =
    vaultState?.teams.filter(
      (t) => !t.hasCompleted && !t.isEliminated && !activeTeamIds.has(t.id)
    ) || [];

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30">
      <div className="scanline"></div>
      <div className="particle-bg"></div>

      <Navbar />

      <main className="max-w-6xl mx-auto p-6 md:p-10 pt-32 grid-bg-subtle min-h-screen">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
            Round 2 // The Vault Escape
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">
            Vault <span className="text-white/20">Escape</span>
          </h1>
          <p className="text-text/40 text-sm max-w-xl mx-auto uppercase tracking-widest font-light mt-2">
            Unlock the vault before time runs out. Every second counts.
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,229,255,0.4)]"></div>
          </div>
        ) : (
          <>
            {/* ─── LIVE STOPWATCHES ─── */}
            {vaultState?.activeSessions && vaultState.activeSessions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {vaultState.activeSessions.map((session) => {
                  const team = getActiveTeam(session.teamId);
                  if (!team) return null;
                  const elapsed = now - session.startTime;
                  
                  return (
                    <div key={session.teamId} className="terminal-card border-primary/30 overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-primary text-[10px] uppercase tracking-[4px] font-bold">
                            <Timer size={14} className="animate-pulse" />
                            Live — Active Session
                          </div>
                          <div className="text-[10px] text-text/40 font-geist-mono">
                            ID: {session.teamId.slice(0, 8)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all">
                            <Lock size={20} />
                          </div>
                          <div>
                            <div className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                              {team.name}
                            </div>
                            <div className="flex gap-3 mt-0.5">
                              <span className="text-[9px] text-text/40 uppercase tracking-widest flex items-center gap-1">
                                <HeartPulse size={10} className="text-danger" /> {3 - team.lifelinesUsed}/3 Lifelines
                              </span>
                              <span className="text-[9px] text-text/40 uppercase tracking-widest flex items-center gap-1">
                                <Lock size={10} className="text-warning" /> {team.lockPenalties} Penalties
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stopwatch Display */}
                        <div className="bg-black/20 p-4 border border-white/5 rounded-sm mb-4">
                          <div className="text-5xl font-black text-primary glow-text font-geist-mono tracking-tighter tabular-nums text-center">
                            {formatTimePrecise(elapsed)}
                          </div>
                        </div>

                        {/* Visual progress bar (pulsing) */}
                        <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary animate-[shimmer_2s_infinite]" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── COMPLETED TEAMS LEADERBOARD ─── */}
            <div className="terminal-card border-white/5 overflow-hidden p-0 mb-8">
              <div className="bg-white/[0.03] p-6 border-b border-white/10 flex items-center gap-2">
                <Trophy size={18} className="text-primary opacity-50" />
                <span className="text-xs font-bold uppercase tracking-[3px] text-text/60">
                  Vault Results — Final Rankings
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-text/30">
                      <th className="px-6 py-4 font-bold">Rank</th>
                      <th className="px-6 py-4 font-bold">Squad</th>
                      <th className="px-6 py-4 font-bold text-center">Vault Time</th>
                      <th className="px-6 py-4 font-bold text-center">Lifelines</th>
                      <th className="px-6 py-4 font-bold text-center">Lock Errors</th>
                      <th className="px-6 py-4 font-bold text-center">Penalties</th>
                      <th className="px-6 py-4 font-bold text-right">Total Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {completedTeams.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-text/20 text-sm">
                          No teams have completed the vault yet.
                        </td>
                      </tr>
                    )}
                    {completedTeams.map((team, idx) => (
                      <tr key={team.id} className="group hover:bg-primary/[0.02] transition-colors">
                        <td className="px-6 py-5">
                          <div
                            className={`w-8 h-8 flex items-center justify-center font-black italic rounded-sm border ${
                              idx === 0
                                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                                : idx === 1
                                ? 'bg-white/10 border-white/30 text-white/50'
                                : idx === 2
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-500/50'
                                : 'border-white/5 text-text/20'
                            }`}
                          >
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-text group-hover:text-white uppercase transition-colors">
                            {team.name}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm font-geist-mono text-text/70">{formatTime(team.vaultTime)}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <HeartPulse
                                key={i}
                                size={12}
                                className={i < team.lifelinesUsed ? 'text-danger' : 'text-success/40'}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`text-sm font-bold ${team.lockPenalties > 0 ? 'text-warning' : 'text-text/30'}`}>
                            {team.lockPenalties}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-[10px] text-danger/70 font-mono">
                            +{formatTime(team.lifelinePenalty + team.lockPenalty)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-sm font-black text-primary glow-text italic tracking-tight">
                            {formatTime(team.totalTime)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── ELIMINATED + PENDING ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Eliminated */}
              <div className="terminal-card border-danger/10">
                <div className="flex items-center gap-2 text-danger text-[10px] uppercase tracking-[3px] font-bold mb-4">
                  <Skull size={14} />
                  Eliminated
                </div>
                {eliminatedTeams.length === 0 ? (
                  <p className="text-text/20 text-sm">No eliminations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {eliminatedTeams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between px-4 py-3 bg-danger/5 border border-danger/10 rounded-sm">
                        <span className="text-sm font-bold text-danger/80 uppercase">{team.name}</span>
                        <span className="text-[9px] text-danger/50 uppercase tracking-widest">3/3 Lifelines Used</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending */}
              <div className="terminal-card border-white/5">
                <div className="flex items-center gap-2 text-text/40 text-[10px] uppercase tracking-[3px] font-bold mb-4">
                  <Clock size={14} />
                  Waiting Queue
                </div>
                {pendingTeams.length === 0 ? (
                  <p className="text-text/20 text-sm">All teams have entered the vault.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingTeams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/5 rounded-sm">
                        <span className="text-sm font-bold text-text/60 uppercase">{team.name}</span>
                        <span className="text-[9px] text-text/20 uppercase tracking-widest">Standby</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={<Zap size={16} />}
                label="Teams Completed"
                value={completedTeams.length}
              />
              <StatCard
                icon={<AlertTriangle size={16} />}
                label="Teams Eliminated"
                value={eliminatedTeams.length}
              />
              <StatCard
                icon={<Timer size={16} />}
                label="Best Time"
                value={
                  completedTeams.length > 0
                    ? formatTime(completedTeams[0].totalTime)
                    : '--:--'
                }
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="terminal-card border-white/5 flex flex-col gap-6 group hover:translate-y-[-2px] transition-all text-left">
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] uppercase tracking-[4px] text-text/30 font-bold">{label}</span>
        <div className="p-2 bg-white/5 rounded-sm opacity-50 group-hover:opacity-100 transition-opacity text-primary">{icon}</div>
      </div>
      <div className="stat-value text-text/80 group-hover:text-white transition-colors relative z-10">{value}</div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-20 group-hover:opacity-50 transition-opacity"></div>
    </div>
  );
}
