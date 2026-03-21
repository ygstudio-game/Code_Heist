'use client';

import { useEffect, useState } from 'react';
import CreditDisplay from '@/components/CreditDisplay';
import MonacoEditor from '@/components/MonacoEditor';
import { fetchWithAuth } from '@/lib/api';
import { ShieldAlert, Cpu, Database, Activity, Zap, Terminal } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BootSequence from '@/components/BootSequence';
import SolverInfoModal from '@/components/SolverInfoModal';
import { toast } from 'sonner';

import { Team } from '@/types';

interface Snippet {
  id: string;
  title: string;
  category: string;
  buggyCode: string;
  reward?: number;
}

export default function DashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [activeSolver, setActiveSolver] = useState<{ name: string; role: string } | null>(null);
  const [isSolverModalOpen, setIsSolverModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock snippets for demo - in real app, fetch these from acquired bids
  const [snippets] = useState<Snippet[]>([
    { 
      id: 'snippet-001', 
      title: 'Memory Leak in Core Module', 
      category: 'C++', 
      buggyCode: `void process() {\n  // [EDITABLE ZONE START]\n  int* ptr = new int[100];\n  // FIX ME: Delete the pointer\n  // [EDITABLE ZONE END]\n}`,
      reward: 500
    },
    { 
      id: 'snippet-002', 
      title: 'Buffer Overflow Payload', 
      category: 'CP', 
      buggyCode: `void exploit() {\n  // [EDITABLE ZONE START]\n  \n  // [EDITABLE ZONE END]\n}`,
      reward: 750
    }
  ]);

  useEffect(() => {
    const savedTeam = localStorage.getItem('team');
    if (savedTeam && !team) {
      setTimeout(() => {
        setTeam(JSON.parse(savedTeam));
      }, 0);
    }

    fetchWithAuth('/auth/me')
      .then((res: Response) => res.json())
      .then((data: Team) => {
        if (!data.error) {
          setTeam(data);
          localStorage.setItem('team', JSON.stringify(data));
        }
      });
  }, [team]);

  useEffect(() => {
    if (activeSnippet && !currentCode) {
      setCurrentCode(activeSnippet.buggyCode);
    }
  }, [activeSnippet, currentCode]);

  const handleSnippetSelect = (snippet: Snippet) => {
    setActiveSnippet(snippet);
    setCurrentCode(snippet.buggyCode);
    
    // If no solver is set, ask for identification
    if (!activeSolver) {
      setIsSolverModalOpen(true);
    }
  };

  const handleSolverSave = (name: string, role: string) => {
    setActiveSolver({ name, role });
    toast.success(`Operator Logged: ${name} (${role.replace('_', ' ')})`, {
      style: { background: '#131620', border: '1px solid #00E5FF', color: '#00E5FF' }
    });
  };

  const handleUpload = async () => {
    if (!activeSnippet || !activeSolver) {
      toast.error('CRITICAL ERROR: No active objective or operator identified.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth('/code/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippetId: activeSnippet.id,
          code: currentCode,
          solverName: activeSolver.name,
          solverRole: activeSolver.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Payload Verified. Access Granted.', {
          duration: 4000
        });
        // Update team credits or local state if needed
      } else {
        toast.error(data.error || 'Uplink Failed: Logic Error Detected.');
      }
    } catch (error) {
      toast.error('TERMINAL ERROR: Connection Lost During Upload.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!team) return <div className="bg-background min-h-screen"></div>;

  return (
    <div className="min-h-screen bg-background font-space selection:bg-primary/30 data-stream-bg">
      <BootSequence />
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <Navbar />

      <SolverInfoModal 
        isOpen={isSolverModalOpen} 
        onClose={() => setIsSolverModalOpen(false)} 
        onSave={handleSolverSave} 
      />

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
              {snippets.map(snippet => (
                <div 
                  key={snippet.id} 
                  onClick={() => handleSnippetSelect(snippet)}
                  className={`p-4 border transition-all cursor-pointer group rounded-sm ${
                    activeSnippet?.id === snippet.id 
                    ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,229,255,0.1)]' 
                    : 'border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-text/20 font-geist-mono group-hover:text-primary/50">#{snippet.id.split('-')[1]}</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">{snippet.category}</span>
                  </div>
                  <h4 className="text-xs font-bold group-hover:text-primary transition-colors uppercase tracking-tight">{snippet.title}</h4>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] text-text/30 font-geist-mono">REWARD</span>
                    <span className="text-[10px] text-primary font-bold">{snippet.reward} CR</span>
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
                <span className="text-[10px] font-geist-mono text-text/40 uppercase tracking-[3px]">
                  {activeSnippet ? `active_node_${activeSnippet.id.split('-')[1]}.ts` : 'workspace_main.ts'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {activeSolver && (
                  <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                    <div className="text-right">
                      <p className="text-[7px] text-text/30 uppercase tracking-widest leading-none">Session Operator</p>
                      <p className="text-[9px] text-primary font-bold">{activeSolver.name}</p>
                    </div>
                    <Terminal size={12} className="text-primary/50" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_5px_var(--color-success)]"></div>
                  <span className="text-[9px] text-success/80 font-geist-mono tracking-widest uppercase">Live Connection</span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
               {!activeSnippet ? (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                    <div className="text-center space-y-4">
                      <Terminal size={48} className="mx-auto text-white/5 animate-pulse" />
                      <p className="text-[10px] text-white/20 uppercase tracking-[5px]">Select Objective to Begin</p>
                    </div>
                 </div>
               ) : null}
               <MonacoEditor 
                  code={currentCode} 
                  language={activeSnippet?.category.toLowerCase() === 'c++' ? 'cpp' : 'typescript'}
                  onCodeChange={setCurrentCode}
               />
            </div>
            <div className="p-4 bg-white/[0.03] border-t border-white/5 flex justify-end gap-6">
               {activeSolver && (
                 <button 
                  onClick={() => setIsSolverModalOpen(true)}
                  className="text-[10px] uppercase font-bold text-text/30 hover:text-white transition-colors tracking-widest"
                 >
                   Switch Operator
                 </button>
               )}
               <button className="text-[10px] uppercase font-bold text-text/30 hover:text-primary transition-colors tracking-widest">Test Payload</button>
               <button 
                disabled={isSubmitting || !activeSnippet}
                onClick={handleUpload}
                className={`terminal-button text-[10px] py-2 px-8 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {isSubmitting ? 'UPLOADING...' : 'Upload Fragment'}
               </button>
            </div>
          </div>

          {/* Right Sidebar - System Logs / Team Status */}
          <div className="col-span-3 terminal-card flex flex-col border-white/5">
            <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-4 border-b border-white/5 pb-2 tracking-[2px]">System Monitor</h3>
            <div className="flex-1 font-geist-mono text-[9px] space-y-3 text-text/40 overflow-y-auto custom-scrollbar">
              <p className="text-success glow-text opacity-70 flex items-center gap-2"><div className="w-1 h-1 bg-success rounded-full"></div> [OK] CONNECTION SECURED</p>
              {activeSolver && <p className="text-primary flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div> [INFO] AGENT {activeSolver.name.toUpperCase()} AUTHENTICATED</p>}
              <p className="flex items-center gap-2"><div className="w-1 h-1 bg-white/20 rounded-full"></div> [INFO] DECRYPTING DATA STREAM...</p>
              <p className="text-danger flex items-center gap-2"><div className="w-1 h-1 bg-danger rounded-full animate-pulse"></div> [WARN] LATENCY COMPROMISE DETECTED</p>
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

function StatCard({ icon, label, value, color = 'primary' }: { icon: React.ReactNode, label: string, value: React.ReactNode, color?: string }) {
  const colorMap: Record<string, string> = {
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