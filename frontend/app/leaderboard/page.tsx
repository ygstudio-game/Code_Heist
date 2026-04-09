'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { TrendingUp, Users, Target, Shield, Zap, Crosshair } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useSystemState } from '@/hooks/useSystemState';
import { useSocket } from '@/context/SocketContext';

import { Team } from '@/types';

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { phase } = useSystemState();
  const { socket, isConnected } = useSocket();
  const [displayMode, setDisplayMode] = useState<'AUCTION' | 'FINAL'>('AUCTION');

  useEffect(() => {
    if (phase === 'FINISHED' || phase === 'VAULT') {
      setDisplayMode('FINAL');
    } else {
      setDisplayMode('AUCTION');
    }
  }, [phase]);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on('submission:update', () => loadTeams());
      socket.on('team:penalty', () => loadTeams());
      socket.on('claim:new', () => loadTeams());
      return () => {
        socket.off('submission:update');
        socket.off('team:penalty');
        socket.off('claim:new');
      };
    }
  }, [isConnected, socket]);

  const calculateGrandChampionStats = (team: any) => {
    const verifiedSubmissions = team.submissions.filter((s: any) => s.status === 'VERIFIED');
    const solvedCount = new Set(verifiedSubmissions.map((s: any) => s.snippetId)).size;
    
    // Average Time Calculation
    // Group by snippetId
    const snippetsGrouped = team.submissions.reduce((acc: any, s: any) => {
      if (!acc[s.snippetId]) acc[s.snippetId] = [];
      acc[s.snippetId].push(s);
      return acc;
    }, {});

    let totalSolveTime = 0;
    let solvedSnippets = 0;

    Object.keys(snippetsGrouped).forEach(sid => {
      const subs = snippetsGrouped[sid].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const acquired = subs.find((s: any) => s.status === 'ACQUIRED');
      const verified = subs.find((s: any) => s.status === 'VERIFIED');
      
      if (acquired && verified) {
        totalSolveTime += (new Date(verified.createdAt).getTime() - new Date(acquired.createdAt).getTime()) / 1000;
        solvedSnippets++;
      }
    });

    const avgTime = solvedSnippets > 0 ? totalSolveTime / solvedSnippets : Infinity;
    
    // Accuracy
    const totalAttempts = team.submissions.filter((s: any) => s.status === 'VERIFIED' || s.status === 'FAILED').length;
    const accuracy = totalAttempts > 0 ? verifiedSubmissions.length / totalAttempts : 0;

    // Vault Phase Integration
    const vaultTime = team.vaultTime || 0;
    const lifelinesUsed = team.lifelinesUsed || 0;
    const lockPenalties = team.lockPenalties || 0;
    const lifelinePenalty = lifelinesUsed * 180; // 3 min per lifeline
    const lockPenalty = lockPenalties * 60; // 1 min per incorrect lock
    const totalVaultTime = vaultTime + lifelinePenalty + lockPenalty;

    // Grand Total = Code Submission Time + Physical Vault Time + Penalties
    const grandTotalTime = totalSolveTime + totalVaultTime;

    return { solvedCount, avgTime, accuracy, credits: team.credits, strikes: team.strikes, vaultTime, totalVaultTime, grandTotalTime };
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const sortedTeams = [...teams].sort((a, b) => {
    if (displayMode === 'AUCTION') {
      return (b.credits || 0) - (a.credits || 0);
    } else {
      const statsA = calculateGrandChampionStats(a);
      const statsB = calculateGrandChampionStats(b);

      if (statsB.solvedCount !== statsA.solvedCount) return statsB.solvedCount - statsA.solvedCount;
      if (statsA.avgTime !== statsB.avgTime) return statsA.avgTime - statsB.avgTime;
      if (statsB.accuracy !== statsA.accuracy) return statsB.accuracy - statsA.accuracy;
      return statsB.credits - statsA.credits;
    }
  });

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 md:p-10 pt-32 text-center grid-bg-subtle min-h-screen">
        <div className="mb-16">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                Uplink Active // Global Rankings
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter italic">
                The <span className="text-white/20">Rankings</span>
              </h1>
            </div>
          <p className="text-text/40 text-sm max-w-xl mx-auto uppercase tracking-widest font-light">
            Live point distribution and team rankings across the platform.
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,229,255,0.4)]"></div>
          </div>
        ) : (
          <div className="terminal-card border-white/5 overflow-hidden p-0 text-left">
            <div className="bg-white/[0.03] p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-primary opacity-50" />
                <span className="text-xs font-bold uppercase tracking-[3px] text-text/60">Squad Rankings</span>
              </div>
              <div className="flex gap-4">
               <button 
                onClick={() => setDisplayMode('AUCTION')}
                className={`px-6 py-2 border font-bold text-[10px] uppercase tracking-widest transition-all ${displayMode === 'AUCTION' ? 'bg-primary text-black border-primary' : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'}`}
               >
                 Auction Results
               </button>
               <button 
                onClick={() => setDisplayMode('FINAL')}
                className={`px-6 py-2 border font-bold text-[10px] uppercase tracking-widest transition-all ${displayMode === 'FINAL' ? 'bg-primary text-black border-primary' : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'}`}
               >
                 Final Standings
               </button>
            </div>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-text/30">
                    <th className="px-4 md:px-8 py-4 font-bold">Rank</th>
                    <th className="px-4 md:px-8 py-4 font-bold">Squad Identity</th>
                    {displayMode === 'FINAL' && (
                      <>
                        <th className="px-4 md:px-8 py-4 font-bold text-center">Solved</th>
                        <th className="px-4 md:px-8 py-4 font-bold text-center">Avg Time</th>
                        <th className="px-4 md:px-8 py-4 font-bold text-center">Accuracy</th>
                      </>
                    )}
                    <th className="px-4 md:px-8 py-4 font-bold text-right">Status</th>
                    <th className="px-4 md:px-8 py-4 font-bold text-right">{displayMode === 'AUCTION' ? 'Liquid Credits' : 'Final Points'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                   {sortedTeams.map((team, idx) => {
                     const stats = calculateGrandChampionStats(team);
                     return (
                      <tr key={team.id} className={`group hover:bg-primary/[0.02] transition-colors ${team.strikes >= 3 ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-8 py-6">
                          <div className={`w-8 h-8 flex items-center justify-center font-black italic rounded-sm border ${
                            idx === 0 ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 
                            idx === 1 ? 'bg-white/10 border-white/30 text-white/50' :
                            idx === 2 ? 'bg-orange-500/10 border-orange-500/30 text-orange-500/50' : 'border-white/5 text-text/20'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-text/40 group-hover:border-primary/40 group-hover:text-primary transition-all">
                              {team.role === 'ADMIN' ? <Shield size={16} /> : <Users size={16} />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text group-hover:text-white uppercase transition-colors">{team.name}</div>
                              <div className="text-[9px] text-text/20 font-geist-mono tracking-widest">OBJ_COUNT: {stats.solvedCount}</div>
                            </div>
                          </div>
                        </td>
                        {displayMode === 'FINAL' && (
                          <>
                            <td className="px-8 py-6 text-center">
                               <div className="flex items-center justify-center gap-1 text-white font-bold">
                                  <Zap size={10} className="text-primary" /> {stats.solvedCount}
                               </div>
                            </td>
                            <td className="px-8 py-6 text-center text-[10px] text-text/60">
                               {stats.avgTime === Infinity ? '--' : `${stats.avgTime.toFixed(1)}s`}
                            </td>
                            <td className="px-8 py-6 text-center">
                               <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                                  <div className="h-full bg-primary" style={{ width: `${stats.accuracy * 100}%` }}></div>
                               </div>
                               <span className="text-[8px] text-text/30">{(stats.accuracy * 100).toFixed(0)}%</span>
                            </td>
                          </>
                        )}
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-sm border ${
                              team.strikes >= 3 ? 'bg-danger/10 border-danger/30 text-danger' : 
                              team.strikes > 0 ? 'bg-warning/10 border-warning/30 text-warning' :
                              'bg-success/10 border-success/30 text-success'
                            } uppercase font-bold tracking-tighter`}>
                              {team.strikes >= 3 ? 'Compromised' : 'Active'}
                            </span>
                            {team.strikes > 0 && <span className="text-[8px] text-danger/60 font-mono">STRIKE_PENALTY: -{team.strikes * 50}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="text-sm font-black text-primary glow-text italic tracking-tight">
                            {displayMode === 'AUCTION' ? `${team.credits.toLocaleString()} CR` : `${Math.max(0, stats.solvedCount * 1000 - team.strikes * 50).toLocaleString()} PTS`}
                          </div>
                          <div className="text-[8px] text-text/20 uppercase tracking-widest">{displayMode === 'AUCTION' ? 'Liquid Capital' : 'Network Authority'}</div>
                        </td>
                      </tr>
                     );
                   })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <HighlightCard icon={<TrendingUp size={16} />} label="Total Economy" value={`${teams.reduce((acc, t) => acc + (t.credits || 0), 0).toLocaleString()} CR`} />
          <HighlightCard icon={<Users size={16} />} label="Active Operators" value={teams.length * 4} />
          <HighlightCard icon={<Target size={16} />} label="Heist Progress" value="64%" />
        </div>
      </main>
    </div>
  );
}

function HighlightCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
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
