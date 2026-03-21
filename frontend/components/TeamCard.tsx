'use client';

import { Shield, ShieldAlert, Cpu, Coins } from 'lucide-react';

interface TeamCardProps {
  team: {
    name: string;
    credits: number;
    strikes: number;
    isEliminated: boolean;
    role: string;
  };
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <div className={`terminal-card overflow-hidden group ${team.isEliminated ? 'opacity-50 grayscale' : 'hover:border-primary/50'}`}>
      <div className="bg-surface p-4 border-b border-border flex justify-between items-center group-hover:bg-primary/5 transition-colors">
        <h4 className="font-bold text-sm uppercase tracking-wider">{team.name}</h4>
        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
          team.isEliminated ? 'bg-danger text-text' : 'bg-primary/20 text-primary'
        }`}>
          {team.isEliminated ? 'Terminated' : 'Active Link'}
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-primary/60" />
            <span className="text-[10px] text-text/40 uppercase font-mono">Ledger</span>
          </div>
          <span className="text-xl font-bold text-primary tabular-nums">
            {team.credits.toLocaleString()}<span className="text-[10px] ml-1">CR</span>
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-danger/60" />
            <span className="text-[10px] text-text/40 uppercase font-mono">Violations</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-4 h-1 rounded-full ${s <= team.strikes ? 'bg-danger shadow-[0_0_8px_#FF2A55]' : 'bg-border'}`} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0B0D14] p-3 flex justify-between items-center text-[8px] font-geist-mono text-text/30 uppercase tracking-[2px]">
        <span>{`// Sector: ${team.role === 'ADMIN' ? 'Command' : 'Infiltration'}`}</span>
        <button className="text-primary/40 hover:text-primary transition-colors cursor-pointer">View Dossier</button>
      </div>
    </div>
  );
}
