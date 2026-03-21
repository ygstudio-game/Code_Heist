import React, { useState } from 'react';
import { User, Shield, Terminal } from 'lucide-react';

interface SolverInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, role: string) => void;
}

const SolverInfoModal: React.FC<SolverInfoModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('TEAM_MEMBER');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name, role);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="terminal-card max-w-md w-full border-primary/30 shadow-[0_0_50px_rgba(0,229,255,0.1)] relative overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
        
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <Terminal size={20} className="text-primary" />
          <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">
            OPERATOR <span className="text-primary">IDENTIFICATION</span>
          </h2>
        </div>

        <p className="text-[10px] text-text/40 uppercase mb-6 font-mono leading-relaxed">
          [System] Each terminal session requires operator validation. 
          Please identify the active agent for this objective.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-primary uppercase font-bold tracking-[3px] flex items-center gap-2">
              <User size={12} /> Agent Name
            </label>
            <input
              autoFocus
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER CALLSIGN..."
              className="w-full bg-white/[0.03] border border-white/10 p-3 text-sm font-mono text-white focus:border-primary/50 outline-none transition-all placeholder:text-white/10 rounded-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('TEAM_LEADER')}
              className={`p-4 border flex flex-col items-center gap-2 transition-all rounded-sm group ${
                role === 'TEAM_LEADER' 
                ? 'border-primary/50 bg-primary/10' 
                : 'border-white/5 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <Shield size={20} className={role === 'TEAM_LEADER' ? 'text-primary' : 'text-white/20 group-hover:text-white/40'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${role === 'TEAM_LEADER' ? 'text-primary' : 'text-white/40'}`}>
                Team Leader
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole('TEAM_MEMBER')}
              className={`p-4 border flex flex-col items-center gap-2 transition-all rounded-sm group ${
                role === 'TEAM_MEMBER' 
                ? 'border-primary/50 bg-primary/10' 
                : 'border-white/5 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <User size={20} className={role === 'TEAM_MEMBER' ? 'text-primary' : 'text-white/20 group-hover:text-white/40'} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${role === 'TEAM_MEMBER' ? 'text-primary' : 'text-white/40'}`}>
                Team Member
              </span>
            </button>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-[10px] uppercase font-bold text-white/30 hover:text-white/60 transition-colors tracking-[2px]"
            >
              Abort sequence
            </button>
            <button
              type="submit"
              className="flex-[2] terminal-button py-3 text-[10px] tracking-[4px]"
            >
              INITIALIZE SESSION
            </button>
          </div>
        </form>

        <div className="absolute bottom-0 right-0 p-2 opacity-10">
          <Terminal size={64} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default SolverInfoModal;
