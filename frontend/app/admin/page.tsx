'use client';

import { useState, useEffect } from 'react';
import TeamCard from '@/components/TeamCard';
import { fetchWithAuth } from '@/lib/api';
import { Users, RefreshCw, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BootSequence from '@/components/BootSequence';

import { Team } from '@/types';

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetchWithAuth('/teams');
        if (res.ok) {
          const data: Team[] = await res.json();
          setTeams(data);
        }
      } catch {
        toast.error('Failed to sync with Aegis network');
      } finally {
        setLoading(false);
      }
    };
    loadTeams();
  }, []);

  const handleGlobalPause = () => {
    toast.warning('GLOBAL KILL-SWITCH ACTIVATED');
  };

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30 data-stream-bg">
      <BootSequence />
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-10 pt-32 min-h-screen grid-bg-subtle">
         {/* Admin Header Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <AdminStatCard icon={<Users size={18} />} label="Registered Squads" value={teams.length} color="primary" />
          <AdminStatCard icon={<TrendingUp size={18} />} label="Total Credits" value={teams.reduce((acc, t) => acc + (t.credits || 0), 0)} color="success" />
          <AdminStatCard icon={<AlertTriangle size={18} />} label="Active Incidents" value={teams.reduce((acc, t) => acc + (t.strikes || 0), 0)} color="danger" />
          <AdminStatCard icon={<Activity size={18} />} label="System Load" value="OPTIMAL" color="success" />
        </div>

        <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white glow-text tracking-tighter uppercase">Command <span className="text-primary italic">Center</span></h1>
            <p className="text-[10px] text-text/40 font-geist-mono uppercase tracking-[4px] mt-2">Real-time Squad Oversight // Level 5 Access</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleGlobalPause} className="terminal-button text-[10px] py-1.5 px-6 border-danger/40 text-danger hover:bg-danger/10">EMERGENCY PAUSE</button>
            <button className="terminal-button text-[10px] py-1.5 px-6">RESUME HEIST</button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-[10px] font-bold uppercase tracking-[3px] text-text/40">Active Squad Streams</h2>
              <button className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-2 font-mono uppercase transition-colors">
                <RefreshCw size={10} /> Syncing Live Data
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teams.map(team => (
                <div key={team.id} className="relative group">
                  <TeamCard team={team} />
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button className="bg-primary/20 border border-primary text-primary text-[10px] font-bold py-2 uppercase">Add Credits</button>
                      <button className="bg-danger/20 border border-danger text-danger text-[10px] font-bold py-2 uppercase">Flag Team</button>
                      <button className="bg-surface border border-border text-text/60 text-[10px] font-bold py-2 uppercase col-span-2">Reset Sync</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AdminStatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary border-primary/20 bg-primary/5',
    success: 'text-success border-success/20 bg-success/5',
    danger: 'text-danger border-danger/20 bg-danger/5',
  };

  return (
    <div className={`terminal-card border-white/5 flex flex-col gap-6 group hover:translate-y-[-2px] transition-all`}>
      <div className="flex justify-between items-center relative z-10">
        <span className="text-[10px] uppercase tracking-[4px] text-text/30 font-bold">{label}</span>
        <div className={`p-2 bg-white/5 rounded-sm opacity-50 group-hover:opacity-100 transition-opacity ${colorMap[color].split(' ')[0]}`}>{icon}</div>
      </div>
      <div className={`stat-value relative z-10 ${colorMap[color].split(' ')[0]}`}>{value}</div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20 group-hover:opacity-50 transition-opacity"></div>
    </div>
  );
}
