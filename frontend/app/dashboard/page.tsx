'use client';

import { useEffect, useState } from 'react';
import CreditDisplay from '@/components/CreditDisplay';
import MonacoEditor from '@/components/MonacoEditor';
import { fetchWithAuth } from '@/lib/api';
import { ShieldAlert, Cpu, Database, Activity, Zap, Terminal, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BootSequence from '@/components/BootSequence';
import SolverInfoModal from '@/components/SolverInfoModal';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Team } from '@/types';
import { useSocket } from '@/context/SocketContext';
import { useSystemState } from '@/hooks/useSystemState';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useAuction } from '@/hooks/useAuction';

interface Snippet {
  id: string;
  title: string;
  category: string;
  buggyCode: string;
  expected?: string;
  hiddenInput?: string;
  reward?: number;
  auctionWinAmount?: number;
  submissionStatus?: string;
  claimant?: string;
}

export default function DashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [activeSolver, setActiveSolver] = useState<{ name: string; role: string } | null>(null);
  const [isSolverModalOpen, setIsSolverModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const { socket, isConnected } = useSocket();
  const { phase, codingStartTime } = useSystemState();
  const { active: activeAuction } = useAuction();
  const { breaches } = useAntiCheat(team?.id || 'default', phase);
  const router = useRouter();
  const [codingTimeLeft, setCodingTimeLeft] = useState<number | null>(null);

  // Testing Payload State
  const [customInput, setCustomInput] = useState('');
  const [testOutput, setTestOutput] = useState<{stdout: string, stderr: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Submissions State
  const [activeConsoleTab, setActiveConsoleTab] = useState<'console' | 'submissions'>('console');
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);

  // Fetch submissions whenever checking the submissions tab
  const fetchSubmissions = async () => {
    if (!activeSnippet) return;
    try {
      const res = await fetchWithAuth('/code/my-submissions');
      if (res.ok) {
        const data = await res.json();
        setMySubmissions(data.filter((s: any) => s.snippetId === activeSnippet.id && s.status !== 'ACQUIRED'));
      }
    } catch (error) {
      console.error('Failed to fetch submissions');
    }
  };

  useEffect(() => {
    if (activeConsoleTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeConsoleTab, activeSnippet]);

  useEffect(() => {
    fetchWithAuth('/code/my-snippets')
      .then((res: Response) => res.json())
      .then((data: Snippet[]) => {
        if (Array.isArray(data)) {
          setSnippets(data);
          
          // Auto-select if a solver is already logged and has a claim
          const savedSolver = localStorage.getItem('activeSolver');
          if (savedSolver) {
            const solver = JSON.parse(savedSolver);
            const myClaim = data.find(s => s.claimant === solver.name);
            if (myClaim) {
              setActiveSnippet(myClaim);
              setCurrentCode(myClaim.buggyCode);
            }
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const savedTeam = localStorage.getItem('team');
    if (savedTeam && !team) {
      setTeam(JSON.parse(savedTeam));
    }

    fetchWithAuth('/auth/me')
      .then((res: Response) => res.json())
      .then((data: Team) => {
        if (data && !data.error) {
          setTeam(data);
          localStorage.setItem('team', JSON.stringify(data));
        }
      })
      .catch(err => console.error('Auth sync failed:', err));
  }, []);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on('claim:new', ({ snippetId, solverName }) => {
        setSnippets(prev => prev.map(s => s.id === snippetId ? { ...s, claimant: solverName } : s));
        if (activeSnippet?.id === snippetId) {
          toast.info(`Sector claimed by ${solverName}`);
        }
      });
      socket.on('claim:released', ({ snippetId }) => {
        setSnippets(prev => prev.map(s => s.id === snippetId ? { ...s, claimant: undefined } : s));
      });
      socket.on('submission:status', ({ snippetId, data }) => {
        setSnippets(prev => prev.map(s => 
          s.id === snippetId ? { ...s, submissionStatus: data.status } : s
        ));
      });
      return () => {
        socket.off('claim:new');
        socket.off('claim:released');
        socket.off('submission:status');
      };
    }
  }, [isConnected, socket, activeSnippet]);

  const handleTestCode = async () => {
    if (!activeSnippet || !currentCode) return;
    setIsTesting(true);
    setTestOutput(null);
    try {
      const res = await fetchWithAuth('/code/run', {
        method: 'POST',
        body: JSON.stringify({
          code: currentCode,
          language: activeSnippet.category,
          customInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setTestOutput({ stdout: data.stdout || '', stderr: data.stderr || '' });
    } catch (error: any) {
      toast.error('Test execution failed');
      setTestOutput({ stdout: '', stderr: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Fullscreen Enforcement during CODING phase
  useEffect(() => {
    if (phase === 'CODING') {
      const enterFullscreen = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            toast.error('SECURITY ALERT: Fullscreen mode is MANDATORY for this phase.');
          });
        }
      };

      // Attempt to enter fullscreen immediately
      enterFullscreen();

      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          toast.warning('SECURITY BREACH: Unauthorized Exit from Fullscreen.', {
            description: 'Please return to fullscreen to continue the objective.'
          });
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  }, [phase]);

  // 60-minute coding countdown
  useEffect(() => {
    if (phase !== 'CODING' || !codingStartTime) {
      setCodingTimeLeft(null);
      return;
    }

    const calcTimeLeft = () => {
      const start = new Date(codingStartTime).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      return Math.max(0, 3600 - elapsed);
    };

    setCodingTimeLeft(calcTimeLeft());
    const interval = setInterval(() => {
      setCodingTimeLeft(calcTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, codingStartTime]);

  useEffect(() => {
    if (activeSnippet && !currentCode) {
      setCurrentCode(activeSnippet.buggyCode);
    }
  }, [activeSnippet, currentCode]);

  const handleSnippetSelect = (snippet: Snippet) => {
    if (phase !== 'CODING') {
      toast.error(`PHASE LOCK: The ${phase} phase is currently active. Access to nodes is restricted.`);
      return;
    }
    if (snippet.claimant && snippet.claimant !== activeSolver?.name) {
      toast.error(`PROTECTION ACTIVE: Sector engaged by ${snippet.claimant}.`);
      return;
    }
    setActiveSnippet(snippet);
    setCurrentCode(snippet.buggyCode);
  };

  const handleClaim = async (snippet: Snippet) => {
    if (!activeSolver) {
      setIsSolverModalOpen(true);
      return;
    }

    try {
      const response = await fetchWithAuth('/code/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippetId: snippet.id,
          solverName: activeSolver.name,
          solverRole: activeSolver.role
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Problem Claimed. Workspace Ready.');
        setActiveSnippet(snippet);
        setCurrentCode(snippet.buggyCode);
      } else {
        toast.error(data.error || 'Claim Failed.');
      }
    } catch (error) {
      toast.error('Connection Failed.');
    }
  };

  const handleSolverSave = (name: string, role: string) => {
    setActiveSolver({ name, role });
    localStorage.setItem('activeSolver', JSON.stringify({ name, role }));
    toast.success(`Solver Joined: ${name} (${role.replace('_', ' ')})`, {
      style: { background: '#131620', border: '1px solid #00D1FF', color: '#00D1FF' }
    });
  };

  useEffect(() => {
    const savedSolver = localStorage.getItem('activeSolver');
    if (savedSolver) {
      setActiveSolver(JSON.parse(savedSolver));
    }
  }, []);

  const handleUpload = async () => {
    if (!activeSnippet || !activeSolver) {
      toast.error('ERROR: No problem selected or solver identified.');
      return;
    }

    if (phase !== 'CODING') {
      toast.error('DENIED: Coding round has not started.');
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
        toast.success(data.message || 'Code Verified. Submission Successful.', {
          duration: 4000
        });
      } else {
        toast.error(data.error || 'Submission Failed: Check your code logic.');
      }
    } catch (error) {
      toast.error('ERROR: Connection lost during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!team) return <div className="bg-background min-h-screen"></div>;

  // Briefing View for Initial Stage
  if (phase === 'AUCTION' && snippets.length === 0) {
    return (
      <div className="min-h-screen bg-background font-space selection:bg-primary/30 pt-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
          <div className="text-center space-y-4">
             <div className="inline-flex items-center gap-3 px-4 py-1 bg-primary/5 border border-primary/20 text-primary text-[10px] font-mono tracking-[6px] uppercase glow-text">
                [ Competition Briefing ]
             </div>
             <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">
                Initial <span className="text-primary not-italic">Briefing</span>
             </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
             <div className="terminal-card border-white/5 space-y-6">
                <h3 className="text-primary font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                   <Shield size={18} /> THE CODE HEIST RULES
                </h3>
                <div className="space-y-4 text-xs text-text/60 leading-relaxed uppercase tracking-tight">
                   <div className="flex gap-4 p-3 bg-white/[0.02] border border-white/5">
                      <span className="text-primary font-bold">01</span>
                      <p><span className="text-white font-bold">ONE PROBLEM PER MEMBER:</span> Each member must solve exactly one problem. You cannot claim more than one.</p>
                   </div>
                   <div className="flex gap-4 p-3 bg-white/[0.02] border border-white/5">
                      <span className="text-primary font-bold">02</span>
                      <p><span className="text-white font-bold">MINIMUM 4 PROBLEMS:</span> Your team must acquire at least 4 problems during the auction to proceed to the coding round.</p>
                   </div>
                   <div className="flex gap-4 p-3 bg-white/[0.02] border border-white/5">
                      <span className="text-primary font-bold">03</span>
                      <p><span className="text-white font-bold">TAB LOCKDOWN:</span> Any attempt to switch tabs or exit fullscreen will trigger a security alert. 3 violations result in score penalties.</p>
                   </div>
                </div>
             </div>

             <div className="space-y-6 flex flex-col justify-center">
                <div className="terminal-card bg-primary/5 border-primary/20 text-center py-12 space-y-6">
                   <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mx-auto animate-pulse">
                      <Activity size={32} />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-xl font-bold text-white uppercase italic">Awaiting Rounds</h4>
                      <p className="text-[10px] text-text/40 font-mono uppercase tracking-widest">The Auction is currently dormant.</p>
                   </div>
                   {activeAuction && (
                      <button 
                        onClick={() => router.push('/auction')}
                        className="terminal-button px-8 py-3 text-sm animate-bounce"
                      >
                         ENTER AUCTION ROOM
                      </button>
                   )}
                </div>
                {!activeAuction && (
                   <p className="text-[9px] text-center text-text/30 font-mono italic uppercase">
                      &gt; Stand by for system broadcast... Admin will initiate bidding shortly.
                   </p>
                )}
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="p-4 border border-white/5 bg-white/[0.02] rounded-sm text-center">
                <p className="text-[8px] text-text/40 uppercase mb-1">Time Limit</p>
                <p className="text-sm font-bold text-white">60 MINS</p>
             </div>
             <div className="p-4 border border-white/5 bg-white/[0.02] rounded-sm text-center">
                <p className="text-[8px] text-text/40 uppercase mb-1">Total Teams</p>
                <p className="text-sm font-bold text-white">15 SQUADS</p>
             </div>
             <div className="p-4 border border-white/5 bg-white/[0.02] rounded-sm text-center">
                <p className="text-[8px] text-text/40 uppercase mb-1">Security</p>
                <p className="text-sm font-bold text-white">LEVEL 5</p>
             </div>
             <div className="p-4 border border-white/5 bg-white/[0.02] rounded-sm text-center">
                <p className="text-[8px] text-text/40 uppercase mb-1">Submission</p>
                <p className="text-sm font-bold text-white">AUTO-SYNC</p>
             </div>
          </div>
        </div>
      </div>
    );
  }
  if (phase === 'CODING' && snippets.length < 4) {
    return (
      <div className="min-h-screen bg-background font-space selection:bg-primary/30 data-stream-bg flex items-center justify-center p-6">
        <div className="scanline"></div>
        <div className="particle-bg"></div>
        <div className="max-w-2xl w-full terminal-card border-danger/30 bg-danger/5 backdrop-blur-md text-center p-12 radiant-border">
          <ShieldAlert size={64} className="mx-auto text-danger animate-pulse mb-6" />
          <h1 className="text-4xl font-black text-white glow-text tracking-tighter uppercase mb-4">Access Denied</h1>
          <div className="h-px bg-danger/20 mb-8 max-w-[200px] mx-auto"></div>
          <p className="text-text/60 font-geist-mono text-sm leading-relaxed uppercase tracking-[2px]">
            Requirement Not Met: Team <span className="text-white font-bold">{team.name}</span> failed to acquire sufficient problems.
          </p>
          <div className="mt-8 p-4 bg-black/40 border border-danger/10 text-danger/80 text-[10px] font-mono uppercase tracking-[3px]">
            Requirement: 4/4 Problems // Current: {snippets.length}/4 Acquired
          </div>
          <p className="mt-12 text-[10px] text-text/30 font-mono uppercase italic">
            &gt; Please wait for the admin&apos;s next instruction.
          </p>
        </div>
      </div>
    );
  }

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
          <StatCard icon={<Cpu size={16} />} label="Team Role" value={team.role} color="primary" />
          <StatCard icon={<ShieldAlert size={16} />} label="Safety Alerts" value={`${team.strikes}/5 WARNINGS`} color={team.strikes > 0 ? 'danger' : 'success'} />
          {codingTimeLeft !== null ? (
            <StatCard 
              icon={<Activity size={16} />} 
              label="Time Remaining" 
              value={`${Math.floor(codingTimeLeft / 60)}:${(codingTimeLeft % 60).toString().padStart(2, '0')}`} 
              color={codingTimeLeft < 300 ? 'danger' : 'primary'} 
            />
          ) : (
            <StatCard icon={<Activity size={16} />} label="Connection" value="SECURE" color="success" />
          )}
          <StatCard icon={<Zap size={16} />} label="Available Credits" value={<CreditDisplay amount={team.credits} />} color="primary" />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          
          {/* Left Sidebar - Active Snippets & Logs (3 cols) */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-6 h-full">
            <div className="flex-1 terminal-card flex flex-col border-white/5 overflow-hidden">
              <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-4 border-b border-white/5 pb-2 tracking-[2px]">Your Problems</h3>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {snippets.length === 0 ? (
                <div className="p-6 text-center text-white/30 text-[10px] font-mono uppercase tracking-widest border border-white/5 bg-white/[0.02]">
                  No Problems acquired in auction.
                </div>
              ) : snippets.map((snippet: Snippet) => {
                const isClaimedByMe = activeSolver && snippet.claimant === activeSolver.name;
                const isClaimedByOther = snippet.claimant && snippet.claimant !== activeSolver?.name;
                
                // Check if ANY snippet in this category is claimed by the team
                const isCategoryClaimedByOther = !snippet.claimant && snippets.some(s => 
                  s.category === snippet.category && s.claimant && s.claimant !== activeSolver?.name
                );

                return (
                <div 
                  key={snippet.id} 
                  onClick={() => !isClaimedByOther && !isCategoryClaimedByOther && handleSnippetSelect(snippet)}
                  className={`p-4 border transition-all relative group rounded-sm ${
                    activeSnippet?.id === snippet.id 
                    ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,229,255,0.1)]' 
                    : snippet.submissionStatus === 'VERIFIED'
                    ? 'border-success/30 bg-success/5 hover:border-success/60'
                    : (isClaimedByOther || isCategoryClaimedByOther)
                    ? 'border-danger/20 bg-danger/5 opacity-80 cursor-not-allowed'
                    : 'border-white/5 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                  }`}
                >
                  {(isClaimedByOther || isCategoryClaimedByOther) && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <span className="text-[7px] text-danger font-bold uppercase tracking-[2px] rotate-[-5deg] border border-danger p-1 bg-black text-center max-w-[80%]">
                        {isClaimedByOther ? `Taken by ${snippet.claimant}` : `Category Taken: ${snippet.category}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-text/20 font-geist-mono group-hover:text-primary/50">#{snippet.id.slice(0, 8)}</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">{snippet.category}</span>
                  </div>
                  <h4 className="text-xs font-bold group-hover:text-primary transition-colors uppercase tracking-tight">{snippet.title}</h4>
                  <div className="mt-3 flex items-center justify-between">
                    {!snippet.claimant && snippet.submissionStatus !== 'VERIFIED' ? (
                      <button 
                        disabled={isCategoryClaimedByOther}
                        onClick={(e) => { e.stopPropagation(); handleClaim(snippet); }}
                        className={`text-[8px] border px-2 py-1 transition-all font-bold uppercase ${
                          isCategoryClaimedByOther 
                          ? 'border-white/10 text-white/20 cursor-not-allowed' 
                          : 'text-primary border-primary/30 hover:bg-primary hover:text-black'
                        }`}
                      >
                        {isCategoryClaimedByOther ? 'Category Taken' : 'Choose Problem'}
                      </button>
                    ) : (
                      <span className="text-[9px] text-text/30 font-geist-mono">
                        {snippet.submissionStatus === 'VERIFIED' ? (
                           <span className="text-success glow-text uppercase">SOLVED</span>
                        ) : (
                           <span className="text-primary/50 uppercase">ASSIGNED TO: {snippet.claimant}</span>
                        )}
                      </span>
                    )}
                    <span className="text-[10px] text-primary font-bold">{snippet.auctionWinAmount || 0} CR</span>
                  </div>
                </div>
              )})}
            </div>
          </div>
          
          {/* Activity Monitor (compact version) */}
          <div className="h-1/3 terminal-card flex flex-col border-white/5 mt-4 overflow-hidden">
            <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-2 border-b border-white/5 pb-2 tracking-[2px]">Activity Monitor</h3>
            <div className="flex-1 font-geist-mono text-[9px] space-y-2 text-text/40 overflow-y-auto custom-scrollbar">
              <div className="text-success glow-text opacity-70 flex items-center gap-2"><div className="w-1 h-1 bg-success rounded-full"></div> [OK] CONNECTION SECURED</div>
              {activeSolver && <div className="text-primary flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div> [INFO] CODER {activeSolver.name.toUpperCase()} AUTHENTICATED</div>}
            </div>
          </div>
        </div>

          {/* Center Pane - Problem Description (4 cols) */}
          <div className="col-span-1 md:col-span-4 terminal-card flex flex-col p-6 overflow-y-auto border-white/5 custom-scrollbar">
            {activeSnippet ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-bold uppercase text-white">{activeSnippet.title}</h2>
                  <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 border border-primary/20">{activeSnippet.category}</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-black/40 p-4 border border-white/5 rounded-sm">
                    <p className="text-xs text-white/70 leading-relaxed font-geist-mono">
                      Task: Analyze the buggy code provided during the auction and submit a fixed, fully working solution. Ensure your code passes all hidden constraints.
                    </p>
                  </div>
                  
                  {activeSnippet.expected && (
                    <div className="mt-6">
                      <h3 className="text-xs font-bold uppercase text-white/50 mb-2">Expected Output / Constraints</h3>
                      <pre className="bg-black/80 p-4 border border-white/5 text-[11px] text-primary/80 font-mono whitespace-pre-wrap rounded-sm">
                        {activeSnippet.expected}
                      </pre>
                    </div>
                  )}
                  
                  <div className="mt-8 flex justify-between items-center text-[10px] text-white/30 font-mono border-t border-white/5 pt-4">
                    <span>Problem Target: {activeSnippet.id.slice(0, 8)}</span>
                    <span>Status: {activeSnippet.submissionStatus}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <Database size={48} className="mb-4 text-white" />
                <p className="text-xs uppercase tracking-[3px] font-mono">No Problem Selected</p>
                <p className="text-[10px] mt-2 max-w-[200px]">Select an acquired problem from the sidebar to view details.</p>
              </div>
            )}
          </div>

          {/* Right Pane - Monaco Editor Workspace (5 cols) */}
          <div className="col-span-1 md:col-span-5 terminal-card flex flex-col p-0 overflow-hidden border-white/5 radiant-border">
            <div className="bg-white/[0.03] p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <Database size={16} className="text-primary opacity-50" />
                <span className="text-[10px] font-geist-mono text-text/40 uppercase tracking-[3px]">
                  {activeSnippet ? `problem_node_${activeSnippet.id.slice(0, 8)}.ts` : 'workspace_main.ts'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {activeSolver && (
                  <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                    <div className="text-right">
                      <p className="text-[7px] text-text/30 uppercase tracking-widest leading-none">Active Coder</p>
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
                      <p className="text-[10px] text-white/20 uppercase tracking-[5px]">Select a Problem to Start</p>
                    </div>
                 </div>
               ) : null}
               <MonacoEditor 
                  code={currentCode} 
                  language={activeSnippet?.category.toLowerCase() === 'cpp' || activeSnippet?.category === 'CP' ? 'cpp' : (activeSnippet?.category === 'PYTHON' ? 'python' : (activeSnippet?.category === 'C' ? 'c' : 'javascript'))}
                  onCodeChange={setCurrentCode}
                  teamId={team.id}
                  phase={phase}
               />
            </div>

            {/* Dynamic Console / Test Results */}
            <div className="h-40 bg-black/80 border-t border-white/10 flex flex-col">
              <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveConsoleTab('console')}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${activeConsoleTab === 'console' ? 'text-primary border-b border-primary' : 'text-white/40 border-b border-transparent hover:text-white'}`}
                >Console</button>
                <button 
                  onClick={() => setActiveConsoleTab('submissions')}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${activeConsoleTab === 'submissions' ? 'text-primary border-b border-primary' : 'text-white/40 border-b border-transparent hover:text-white'}`}
                >Submissions</button>
              </div>

              {activeConsoleTab === 'console' && (
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[9px] uppercase text-white/30 tracking-widest">Custom Input (STDIN)</span>
                    <textarea 
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="w-full flex-1 bg-white/[0.02] border border-white/10 p-2 text-xs font-mono text-primary/80 focus:outline-none focus:border-primary/50 resize-none custom-scrollbar"
                      placeholder="Enter test input..."
                      disabled={!activeSnippet}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[9px] uppercase text-white/30 tracking-widest">Output (STDOUT/STDERR)</span>
                    <div className="flex-1 bg-white/[0.02] border border-white/10 p-2 overflow-y-auto custom-scrollbar font-mono text-[11px]">
                        {isTesting ? (
                          <div className="flex items-center gap-2 text-primary/50 animate-pulse h-full justify-center">
                            <Terminal size={12} /> EXECUTING PAYLOAD...
                          </div>
                        ) : testOutput ? (
                          <>
                            {testOutput.stdout && <pre className="text-success/80 whitespace-pre-wrap">{testOutput.stdout}</pre>}
                            {testOutput.stderr && <pre className="text-danger whitespace-pre-wrap mt-2">{testOutput.stderr}</pre>}
                            {!testOutput.stdout && !testOutput.stderr && <span className="text-white/20 italic">No output produced.</span>}
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-white/20 italic">Run code to see payload output</div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {activeConsoleTab === 'submissions' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black cursor-default">
                  {mySubmissions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-white/20 italic text-[10px]">No submissions recorded for this problem.</div>
                  ) : (
                    <table className="w-full text-left text-[10px] font-mono">
                      <thead className="bg-white/[0.02] text-white/40 border-b border-white/5 sticky top-0">
                        <tr>
                           <th className="px-6 py-2 font-normal uppercase tracking-wider">Status</th>
                           <th className="px-6 py-2 font-normal uppercase tracking-wider">Language</th>
                           <th className="px-6 py-2 font-normal uppercase tracking-wider">Runtime</th>
                           <th className="px-6 py-2 font-normal uppercase tracking-wider">Memory</th>
                           <th className="px-6 py-2 font-normal uppercase tracking-wider text-right">Time Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mySubmissions.map((sub) => {
                          const runtimeMatch = sub.stdout?.match(/Runtime: (\d+) ms/);
                          const memoryMatch = sub.stdout?.match(/Memory: (\d+) MB/);
                          return (
                          <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-2 font-bold">
                               {sub.status === 'VERIFIED' ? <span className="text-success glow-text">Accepted</span> : <span className="text-danger">Wrong Answer</span>}
                            </td>
                            <td className="px-6 py-2 text-white/60">{activeSnippet?.category}</td>
                            <td className="px-6 py-2 text-white/60">{runtimeMatch ? `${runtimeMatch[1]} ms` : 'N/A'}</td>
                            <td className="px-6 py-2 text-white/60">{memoryMatch ? `${memoryMatch[1]} MB` : 'N/A'}</td>
                            <td className="px-6 py-2 text-right text-white/30">{new Date(sub.createdAt).toLocaleTimeString()}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white/[0.03] border-t border-white/5 flex justify-end items-center gap-6">
               {activeSolver && (
                 <button 
                  onClick={() => setIsSolverModalOpen(true)}
                  className="text-[10px] uppercase font-bold text-text/30 hover:text-white transition-colors tracking-widest mr-auto"
                 >
                   Switch Operator
                 </button>
               )}
               <button 
                 disabled={isTesting || !activeSnippet}
                 onClick={handleTestCode}
                 className={`text-[10px] uppercase font-bold text-text/30 hover:text-primary transition-colors tracking-widest flex items-center gap-2 ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {isTesting ? <span className="animate-pulse">Running...</span> : 'Run Code'}
               </button>
               <button 
                disabled={isSubmitting || !activeSnippet}
                onClick={handleUpload}
                className={`terminal-button text-[10px] py-2 px-8 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {isSubmitting ? 'SUBMITTING...' : 'Submit Solution'}
               </button>
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