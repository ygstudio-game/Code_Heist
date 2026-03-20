'use client';

import { useEffect, useState } from 'react';
import CreditDisplay from '@/components/CreditDisplay';
import MonacoEditor from '@/components/MonacoEditor';
import { fetchWithAuth, clearAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldAlert, Cpu, Database, Activity, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BootSequence from '@/components/BootSequence';

export default function DashboardPage() {
  const [team, setTeam] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const savedTeam = localStorage.getItem('team');
    if (savedTeam) setTeam(JSON.parse(savedTeam));

    fetchWithAuth('/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setTeam(data);
          localStorage.setItem('team', JSON.stringify(data));
        }
      });
  }, []);

  if (!team) return <div className="bg-background min-h-screen"></div>;

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30 data-stream-bg">
      <BootSequence />
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-10 pt-32 grid-bg-subtle min-h-[calc(100vh-64px)]">
        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Cpu size={16} />} label="Operational Role" value={team.role} color="primary" />
          <StatCard icon={<ShieldAlert size={16} />} label="Security Status" value={`${team.strikes}/3 STRIKES`} color={team.strikes > 0 ? 'danger' : 'success'} />
          <StatCard icon={<Activity size={16} />} label="System Uplink" value="ENCRYPTED" color="success" />
          <StatCard icon={<Zap size={16} />} label="Current Credits" value={<CreditDisplay amount={team.credits} />} color="primary" />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          
          {/* Left Sidebar - Active Snippets/Objective */}
          <div className="col-span-3 terminal-card flex flex-col border-white/5">
            <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-4 border-b border-white/5 pb-2 tracking-[2px]">Active Objectives</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group rounded-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-text/20 font-geist-mono group-hover:text-primary/50">#00{i}</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">C++</span>
                  </div>
                  <h4 className="text-xs font-bold group-hover:text-primary transition-colors uppercase tracking-tight">Memory Leak in Core Module</h4>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] text-text/30 font-geist-mono">REWARD</span>
                    <span className="text-[10px] text-primary font-bold">500 CR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center - Monaco Editor Workspace */}
          <div className="col-span-6 terminal-card flex flex-col p-0 overflow-hidden border-white/5 radiant-border">
            <div className="bg-white/[0.03] p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <Database size={16} className="text-primary opacity-50" />
                <span className="text-[10px] font-geist-mono text-text/40 uppercase tracking-[3px]">workspace_main.ts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_5px_var(--color-success)]"></div>
                <span className="text-[9px] text-success/80 font-geist-mono tracking-widest uppercase">Live Connection</span>
              </div>
            </div>
            <div className="flex-1 relative">
               <MonacoEditor 
                  code={`function secureBuffer() {\n  // [EDITABLE ZONE START]\n  \n  // [EDITABLE ZONE END]\n}`} 
                  language="typescript"
               />
            </div>
            <div className="p-4 bg-white/[0.03] border-t border-white/5 flex justify-end gap-6">
               <button className="text-[10px] uppercase font-bold text-text/30 hover:text-primary transition-colors tracking-widest">Test Payload</button>
               <button className="terminal-button text-[10px] py-2 px-8">Upload Fragment</button>
            </div>
          </div>

          {/* Right Sidebar - System Logs / Team Status */}
          <div className="col-span-3 terminal-card flex flex-col border-white/5">
            <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-4 border-b border-white/5 pb-2 tracking-[2px]">System Monitor</h3>
            <div className="flex-1 font-geist-mono text-[9px] space-y-3 text-text/40 overflow-y-auto custom-scrollbar">
              <p className="text-success glow-text opacity-70 flex items-center gap-2"><div className="w-1 h-1 bg-success rounded-full"></div> [OK] CONNECTION SECURED</p>
              <p className="flex items-center gap-2"><div className="w-1 h-1 bg-white/20 rounded-full"></div> [INFO] DECRYPTING SNIPPET #001...</p>
              <p className="text-danger flex items-center gap-2"><div className="w-1 h-1 bg-danger rounded-full animate-pulse"></div> [WARN] LATENCY COMPROMISE DETECTED</p>
              <p className="flex items-center gap-2"><div className="w-1 h-1 bg-white/20 rounded-full"></div> [INFO] COMPILING PAYLOAD...</p>
              <div className="h-px bg-white/5 my-4"></div>
              <p className="text-primary/60 leading-relaxed italic">
                &gt; LIVE TRANSMISSION: TEAM_ZERO_DAY COMPLETED OBJECTIVE #004
              </p>
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.2); }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'primary' }: any) {
  const colorMap: any = {
    primary: 'text-primary border-primary/20 bg-primary/5',
    success: 'text-success border-success/20 bg-success/5',
    danger: 'text-danger border-danger/20 bg-danger/5',
  };

  return (
    <div className={`terminal-card border-white/5 flex flex-col gap-6 group hover:translate-y-[-2px] transition-all radiant-border`}>
      <div className="flex justify-between items-center relative z-10">
        <span className="text-[10px] uppercase tracking-[4px] text-text/30 font-bold">{label}</span>
        <div className={`p-2 bg-white/5 rounded-sm opacity-50 group-hover:opacity-100 transition-opacity ${colorMap[color].split(' ')[0]}`}>{icon}</div>
      </div>
      <div className={`stat-value relative z-10 ${colorMap[color].split(' ')[0]}`}>{value}</div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20 group-hover:opacity-50 transition-opacity"></div>
    </div>
  );
}