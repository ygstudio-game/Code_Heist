'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Trophy, TrendingUp, Users, Target, Shield, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

import { Team } from '@/types';

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetchWithAuth('/teams');
        if (res.ok) {
          const data = await res.json();
          // Sort teams by credits descending
          const sorted = (Array.isArray(data) ? data : []).sort((a: Team, b: Team) => (b.credits || 0) - (a.credits || 0));
          setTeams(sorted);
        }
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 md:p-10 pt-32 text-center grid-bg-subtle min-h-screen">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/20 text-primary text-[10px] font-mono tracking-[5px] uppercase mb-6 glow-text">
            [ Public Statistics Manifest ]
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white glow-text tracking-tighter uppercase mb-4 italic">
            Top <span className="text-primary not-italic">Operatives</span>
          </h1>
          <p className="text-text/40 text-sm max-w-xl mx-auto uppercase tracking-widest font-light">
            Live credit distribution and squad rankings across the Aegis network.
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
              <div className="text-[10px] text-text/30 font-geist-mono uppercase tracking-widest">Auto-Refresh: Active</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-text/30">
                    <th className="px-8 py-4 font-bold">Rank</th>
                    <th className="px-8 py-4 font-bold">Squad Identity</th>
                    <th className="px-8 py-4 font-bold text-right">Status</th>
                    <th className="px-8 py-4 font-bold text-right">Liquid Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {teams.map((team, idx) => (
                    <tr key={team.id} className="group hover:bg-primary/[0.02] transition-colors">
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
                            <div className="text-[9px] text-text/20 font-geist-mono tracking-widest">{team.accessKey}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm border ${
                          team.strikes >= 3 ? 'bg-danger/10 border-danger/30 text-danger' : 
                          team.strikes > 0 ? 'bg-warning/10 border-warning/30 text-warning' :
                          'bg-success/10 border-success/30 text-success'
                        } uppercase font-bold tracking-tighter`}>
                          {team.strikes >= 3 ? 'Compromised' : 'Active'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-sm font-black text-primary glow-text italic tracking-tight">{team.credits.toLocaleString()} CR</div>
                      </td>
                    </tr>
                  ))}
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
