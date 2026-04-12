'use client';

import { useState, useEffect } from 'react';
import TeamCard from '@/components/TeamCard';
import { fetchWithAuth } from '@/lib/api';
import { Users, RefreshCw, AlertTriangle, Activity, TrendingUp, ShieldAlert, Timer } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BootSequence from '@/components/BootSequence';

import { Team, Submission, Snippet, AuctionBid, GameState } from '@/types';
import { useSocket } from '@/context/SocketContext';
import { useSystemState } from '@/hooks/useSystemState';

interface AdminGameState extends Omit<GameState, 'activeAuction'> {
  activeAuction: { id: string; snippet: { title: string; category: string }; endTime: string } | null;
}


interface LogEntry {
  teamName: string;
  problemTitle: string;
  status: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [gameState, setGameState] = useState<AdminGameState | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeAuctionBids, setActiveAuctionBids] = useState<AuctionBid[]>([]);
  const [auctionTimeLeft, setAuctionTimeLeft] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'SOLVED' | 'WARNING'>('ALL');
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const { socket, isConnected } = useSocket();
  const { phase, updatePhase } = useSystemState();

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [stateRes, snippetsRes, submissionsRes] = await Promise.all([
        fetchWithAuth('/admin/game-state'),
        fetchWithAuth('/admin/snippets'),
        fetchWithAuth('/admin/submissions')
      ]);
      
      if (stateRes.ok && snippetsRes.ok && submissionsRes.ok) {
        const state = await stateRes.json();
        setGameState(state);
        setSnippets(await snippetsRes.json());
        
        // Sync active auction bids if live
        if (state.activeAuction) {
           const auctionRes = await fetchWithAuth('/auction/active');
           const auctionData = await auctionRes.json();
           if (auctionData.active) {
              setActiveAuctionBids(auctionData.auction.bids || []);
              setAuctionTimeLeft(auctionData.auction.timeLeft || 0);
           }
        } else {
           setActiveAuctionBids([]);
        }

        const initialSubs = await submissionsRes.json();
        setSubmissions(initialSubs);
        
        // Fetch centralized logs
        const logsRes = await fetchWithAuth('/admin/logs');
        if (logsRes.ok) {
           const initialLogs = await logsRes.json();
           setLogs(initialLogs);
        }
      } else {
         toast.error('Failed to sync with system');
      }
    } catch {
      toast.error('Network Error while syncing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Auction Timer Sync
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState?.activeAuction && auctionTimeLeft > 0) {
      timer = setInterval(() => {
        setAuctionTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState?.activeAuction, auctionTimeLeft]);

  useEffect(() => {
    if (isConnected && socket) {
      socket.emit('join-admin');
      
      socket.on('team:penalty', (data) => {
        loadDashboard();
      });
      socket.on('auction:started', () => {
         toast.info('NEW AUCTION STARTED');
         loadDashboard();
      });
      socket.on('auction:new-bid', (bid: AuctionBid) => {
         setActiveAuctionBids(prev => [bid, ...prev]);
         loadDashboard();
      });
      socket.on('auction:ended', (data: { winner?: { name: string } }) => {
         toast.success(`AUCTION ENDED: ${data.winner?.name || 'CANCELLED'}`);
         setActiveAuctionBids([]);
         loadDashboard();

         // Auto-Pilot Logic
         if (isAutoPilot) {
            setTimeout(() => {
               startNextAuction();
            }, 5000);
         }
      });
      socket.on('admin:newLog', (log: LogEntry) => {
        setLogs(prev => {
          const exists = prev.some(p => 
            p.teamName === log.teamName && 
            p.problemTitle === log.problemTitle && 
            new Date(p.timestamp).getTime() === new Date(log.timestamp).getTime()
          );
          if (exists) return prev;
          return [log, ...prev].slice(0, 50);
        });
        // loadDashboard(); // Remove to avoid race condition overwrite
      });
      return () => {
        socket.off('team:penalty');
        socket.off('auction:started');
        socket.off('auction:new-bid');
        socket.off('auction:ended');
        socket.off('admin:newLog');
      };
    }
  }, [isConnected, socket]);

  const handleStartAuction = async (snippetId: string) => {
    try {
      const res = await fetchWithAuth('/admin/auction/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippetId, duration: 120, isPreviewOnly: isPreviewMode }),
      });
      if (res.ok) {
        toast.success('Auction Started');
        loadDashboard();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to start auction');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const startNextAuction = async () => {
    // Refresh snippets to get latest status
    const res = await fetchWithAuth('/admin/snippets');
    if (!res.ok) return;
    const allSnippets: Snippet[] = await res.json();
    
    // Find first snippet that hasn't been completed in an auction round
    const nextSnippet = allSnippets.find(s => 
      !s.auctionRounds?.some(r => r.status === 'COMPLETED')
    );

    if (nextSnippet) {
      handleStartAuction(nextSnippet.id);
    } else {
      toast.info('All problems auctioned. Starting Coding Phase...');
      setIsAutoPilot(false);
      handleUpdatePhase('CODING');
    }
  };

  const handleUpdatePhase = async (newPhase: string) => {
    try {
      const res = await fetchWithAuth('/system/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase }),
      });
      if (res.ok) {
        toast.success(`Phase updated to ${newPhase}`);
        loadDashboard();
      }
    } catch {
      toast.error('Failed to update phase');
    }
  };

  const handleEndAuction = async () => {
    try {
      const res = await fetchWithAuth('/admin/auction/end', { method: 'POST' });
      if (res.ok) {
        toast.success('Auction Ended');
        loadDashboard();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handlePenalty = async (teamId: string, strikes: number, creditPenalty: number) => {
    try {
      const res = await fetchWithAuth('/admin/penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, strikes, creditPenalty, reason: 'Admin Intervention' }),
      });
      if (res.ok) {
        toast.success('Penalty Applied');
        loadDashboard();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleAdjustCredits = async (teamId: string, customAmount: number) => {
    try {
      const res = await fetchWithAuth('/admin/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, amount: customAmount, reason: 'Admin Manual Adjustment' }),
      });
      if (res.ok) {
        toast.success(`Credits Adjusted by ${customAmount}`);
        loadDashboard();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleForceApprove = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/admin/submissions/${id}/force-approve`, { method: 'POST' });
      if (res.ok) {
        toast.success('Answer approved');
        loadDashboard();
      }
    } catch {
      toast.error('Override Failed');
    }
  };

  const handleForceReject = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/admin/submissions/${id}/force-reject`, { method: 'POST' });
      if (res.ok) {
        toast.success('Answer rejected');
        loadDashboard();
      }
    } catch {
      toast.error('Override Failed');
    }
  };

  const handleForceReset = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/admin/submissions/${id}/force-reset`, { method: 'POST' });
      if (res.ok) {
        toast.success('Answer reset');
        loadDashboard();
      }
    } catch {
      toast.error('Override Failed');
    }
  };

  const handleReleaseClaim = async (teamId: string, snippetId?: string) => {
    try {
      const res = await fetchWithAuth('/admin/submissions/release-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, snippetId }),
      });
      if (res.ok) {
        toast.success('Problem released');
        loadDashboard();
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/30 pt-20">
      <Navbar />
      <BootSequence />
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <main className="max-w-7xl mx-auto p-6 md:p-10 pt-36 md:pt-40 grid-bg-subtle min-h-screen">
         {/* Admin Header Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <AdminStatCard icon={<Users size={18} />} label="Teams" value={gameState?.teams.length || 0} color="primary" />
          <AdminStatCard icon={<TrendingUp size={18} />} label="Total Points" value={gameState?.teams.reduce((acc, t) => acc + (t.credits || 0), 0) || 0} color="success" />
          <AdminStatCard icon={<AlertTriangle size={18} />} label="Warnings" value={gameState?.teams.reduce((acc, t) => acc + (t.strikes || 0), 0) || 0} color="danger" />
          <AdminStatCard icon={<Activity size={18} />} label="Status" value="OPTIMAL" color="success" />
        </div>

        {/* Global Phase Control */}
        <div className="terminal-card bg-black/40 border-white/5 p-4 space-y-4">
                    <div className="flex gap-4 items-center">
                       <button 
                          onClick={() => {
                             if (!isAutoPilot) {
                                startNextAuction();
                             }
                             setIsAutoPilot(!isAutoPilot);
                          }}
                          className={`terminal-button ${isAutoPilot ? 'border-danger text-danger' : ''}`}
                       >
                          {isAutoPilot ? 'STOP AUTO-PILOT' : 'START AUTO AUCTION'}
                       </button>

                       <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-2">
                          <span className="text-[10px] text-text/40 uppercase tracking-widest">Comp. Phase:</span>
                          <div className="flex gap-1">
                             {['AUCTION', 'CODING', 'VAULT', 'FINISHED'].map(p => (
                                <button
                                   key={p}
                                   onClick={() => handleUpdatePhase(p)}
                                   className={`px-3 py-1 text-[9px] font-bold border transition-all ${phase === p ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'text-text/30 border-white/10 hover:border-white/20'}`}
                                >
                                   {p}
                                </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase border-b border-white/5 pb-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              System Active // Competition Management
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">
              Admin <span className="text-white/20">Dashboard</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-4 bg-black/40 p-4 border border-white/5">
             <div className="flex items-center gap-4 mr-4">
               {gameState?.activeAuction ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary animate-pulse">
                       <Timer size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] text-primary uppercase font-mono tracking-widest leading-none mb-1">Auction Live: {formatTime(auctionTimeLeft)}</p>
                       <p className="text-sm font-bold text-white uppercase italic">{gameState.activeAuction.snippet.title}</p>
                    </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-danger/5 border border-danger/20 flex items-center justify-center text-danger/40">
                       <ShieldAlert size={20} />
                    </div>
                    <p className="text-[10px] text-danger/40 uppercase font-mono tracking-widest">Auction Dormant</p>
                  </div>
               )}
             </div>
             
             {gameState?.activeAuction ? (
                <button onClick={handleEndAuction} className="terminal-button text-[10px] py-2 px-6 border-danger/40 text-danger hover:bg-danger/10">FORCE END AUCTION</button>
             ) : (
                <div className="terminal-card bg-black/40 border-white/5 p-4 space-y-4">
                   <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-4">Start Auction Round</span>
                   <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input 
                          type="checkbox" 
                          checked={isPreviewMode} 
                          onChange={(e) => setIsPreviewMode(e.target.checked)} 
                          className="hidden"
                         />
                         <div className={`w-4 h-4 border flex items-center justify-center transition-all ${isPreviewMode ? 'bg-primary border-primary shadow-[0_0_10px_var(--color-primary)]' : 'border-white/20 group-hover:border-white/40'}`}>
                            {isPreviewMode && <div className="w-2 h-2 bg-black"></div>}
                         </div>
                         <span className="text-[10px] font-bold uppercase text-white/60 tracking-widest group-hover:text-white transition-colors">30s Preview Mode</span>
                      </label>
                      <select id="snippet-select" className="bg-black/60 border border-white/10 text-xs font-mono p-2 text-white/70 outline-none w-full">
                        <option value="">-- SELECT PROBLEM --</option>
                        {snippets.map(s => <option key={s.id} value={s.id}>{s.id.slice(0,6)}: {s.title}</option>)}
                      </select>
                      <button 
                        onClick={() => {
                          const sel = document.getElementById('snippet-select') as HTMLSelectElement;
                          if (sel.value) handleStartAuction(sel.value);
                        }} 
                        className="terminal-button text-[10px] py-2 px-6 w-full"
                      >
                        {isPreviewMode ? 'START PREVIEW' : 'START AUCTION'}
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Live Auction Monitor Panel */}
        {gameState?.activeAuction && (
           <div className="grid grid-cols-12 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="col-span-12 lg:col-span-8 terminal-card border-primary/30 bg-primary/5 flex flex-col p-0 overflow-hidden radiant-border">
                 <div className="px-6 py-4 border-b border-primary/20 bg-primary/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <Activity size={18} className="text-primary animate-pulse" />
                       <span className="text-[10px] font-bold uppercase tracking-[4px] text-primary">Buy Problems Now</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <p className="text-[8px] text-primary/60 uppercase font-mono tracking-widest">Time Remaining</p>
                          <p className="text-xl font-black text-white font-mono">{formatTime(auctionTimeLeft)}</p>
                       </div>
                       <button onClick={handleEndAuction} className="bg-danger/20 hover:bg-danger text-danger hover:text-white border border-danger/30 px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all">
                          Force Terminate
                       </button>
                    </div>
                 </div>
                 
                 <div className="flex-1 p-6 grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div>
                          <p className="text-[9px] text-white/30 uppercase font-mono tracking-[3px] mb-2">Problem Target</p>
                          <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{gameState.activeAuction.snippet.title}</h4>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 border border-white/5">
                             <p className="text-[8px] text-white/30 uppercase mb-1">Current High Bid</p>
                             <p className="text-xl font-black text-primary font-mono">{activeAuctionBids[0]?.amount || 0} CR</p>
                          </div>
                          <div className="p-4 bg-white/5 border border-white/5">
                             <p className="text-[8px] text-white/30 uppercase mb-1">Bidder</p>
                             <p className="text-sm font-bold text-white uppercase truncate">{activeAuctionBids[0]?.teamName || 'N/A'}</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="border-l border-white/5 pl-8 space-y-4">
                       <p className="text-[9px] text-white/30 uppercase font-mono tracking-[3px]">Real-time Bid Logs</p>
                       <div className="h-32 overflow-y-auto custom-scrollbar space-y-2">
                          {activeAuctionBids.length > 0 ? activeAuctionBids.map((bid, idx) => (
                             <div key={idx} className="flex justify-between items-center text-[10px] bg-white/[0.02] p-2 border-l-2 border-primary/20">
                                <span className={idx === 0 ? 'text-primary font-bold' : 'text-white/60'}>{bid.teamName}</span>
                                <span className="text-primary font-mono font-bold">{bid.amount} CR</span>
                             </div>
                          )) : (
                             <p className="text-[10px] text-white/20 italic uppercase text-center py-8">Waiting for uplink...</p>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="col-span-12 lg:col-span-4 terminal-card border-white/5 bg-black/40 p-8 space-y-6 flex flex-col justify-center">
                 <div className="space-y-2 text-center">
                    <TrendingUp size={32} className="text-primary/40 mx-auto" />
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Details</h3>
                 </div>
                 <div className="space-y-4">
                     <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Total Bids</span>
                        <span className="text-sm font-bold text-primary font-mono">{activeAuctionBids.length}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Min Increase</span>
                        <span className="text-sm font-bold text-white font-mono">1 CR</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-[10px] text-white/40 uppercase">Time Added</span>
                        <span className="text-sm font-bold text-white font-mono">15s</span>
                     </div>
                 </div>
              </div>
           </div>
        )}

        {loading || !gameState ? (
          <div className="h-64 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-4">
               <h2 className="text-[10px] font-bold uppercase tracking-[3px] text-text/40">Teams</h2>
               <button onClick={loadDashboard} className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-2 font-mono uppercase transition-colors">
                 <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Checking online...
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {gameState.teams.map(team => (
                <div key={team.id} className="relative group">
                  <TeamCard team={team} />
                  <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 border border-primary/30 backdrop-blur-sm z-20">
                    <p className="text-[10px] text-primary mb-4 tracking-widest uppercase font-bold text-center border-b border-primary/20 pb-2 w-full">Team: {team.name}</p>
                    <div className="grid grid-cols-2 gap-2 w-full mb-4">
                      <button onClick={() => handleAdjustCredits(team.id, 500)} className="bg-primary/10 border border-primary/50 text-primary hover:bg-primary/20 hover:text-white transition-colors text-[9px] font-bold py-2 uppercase tracking-widest">
                         +500 CR
                      </button>
                      <button onClick={() => handleAdjustCredits(team.id, -500)} className="bg-danger/10 border border-danger/50 text-danger hover:bg-danger/20 hover:text-white transition-colors text-[9px] font-bold py-2 uppercase tracking-widest">
                         -500 CR
                      </button>
                      <button onClick={() => handlePenalty(team.id, 1, 0)} className="bg-warning/10 border border-warning/50 text-warning hover:bg-warning/20 hover:text-white transition-colors text-[9px] font-bold py-2 col-span-2 uppercase tracking-widest flex items-center justify-center gap-2">
                         <ShieldAlert size={12} /> Issue Strike
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-8 mt-12">
               <div className="col-span-12 lg:col-span-4 terminal-card border-white/5">
                   <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                      <h3 className="text-primary glow-text text-[10px] font-bold uppercase tracking-[2px]">Live Logs</h3>
                      <div className="flex gap-2">
                         {['ALL', 'SOLVED', 'WARNING'].map(f => (
                            <button 
                               key={f}
                               onClick={() => setLogFilter(f as any)}
                               className={`text-[8px] font-bold px-2 py-0.5 border ${logFilter === f ? 'bg-primary text-black border-primary' : 'text-text/40 border-white/10 hover:border-text/30'}`}
                            >
                               {f}
                            </button>
                         ))}
                      </div>
                   </div>
                   <div className="h-96 overflow-y-auto font-geist-mono text-[9px] space-y-2 pr-2 custom-scrollbar">
                      {logs.filter(log => {
                         if (logFilter === 'ALL') return true;
                         if (logFilter === 'SOLVED') return log.status === 'SOLVED' || log.status === 'APPROVED';
                         if (logFilter === 'WARNING') return log.status === 'WARNING';
                         return true;
                      }).map((log, idx) => (
                        <p key={idx} className={log.status === 'APPROVED' || log.status === 'SOLVED' ? 'text-success' : (log.status === 'WARNING' ? 'text-danger' : 'text-primary')}>
                          [{new Date(log.timestamp).toLocaleTimeString()}] {log.teamName}: {log.status} {log.problemTitle}
                        </p>
                      ))}
                   </div>
               </div>
               <div className="col-span-12 lg:col-span-8 terminal-card border-white/5">
                  <h3 className="text-primary glow-text text-[10px] font-bold uppercase mb-4 border-b border-white/5 pb-2 tracking-[2px]">Recent Activity</h3>
                  <div className="h-96 overflow-y-auto custom-scrollbar">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="text-[8px] text-text/30 uppercase tracking-widest border-b border-white/5">
                              <th className="py-2">Team</th>
                              <th className="py-2">Problem</th>
                              <th className="py-2">Status</th>
                              <th className="py-2 text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="text-[10px] font-mono">
                           {submissions.map((sub: Submission) => (
                             <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 text-white font-bold">{sub.team.name}</td>
                                <td className="py-3 text-text/60 italic">{sub.snippet.title}</td>
                                <td className="py-3">
                                   <span className={`px-2 py-1 text-[8px] border ${
                                      sub.status === 'VERIFIED' ? 'border-success text-success' : 
                                      sub.status === 'FAILED' ? 'border-danger text-danger' : 
                                      'border-primary text-primary'
                                   }`}>
                                      {sub.status === 'VERIFIED' ? 'SOLVED' : sub.status}
                                   </span>
                                </td>
                                <td className="py-3 text-right flex justify-end gap-2">
                                    <button onClick={() => handleForceReset(sub.id)} className="text-[8px] bg-white/5 text-white/40 border border-white/10 px-2 py-1 hover:bg-white/10 transition-all uppercase">Reset</button>
                                    {(sub.status === 'TESTING' || sub.status === 'FAILED') && (
                                       <button onClick={() => handleForceApprove(sub.id)} className="text-[8px] bg-success/10 text-success border border-success/30 px-2 py-1 hover:bg-success hover:text-black transition-all uppercase">Approve</button>
                                    )}
                                    {(sub.status === 'TESTING' || sub.status === 'VERIFIED') && (
                                       <button onClick={() => handleForceReject(sub.id)} className="text-[8px] bg-danger/10 text-danger border border-danger/30 px-2 py-1 hover:bg-danger hover:text-black transition-all uppercase">Reject</button>
                                    )}
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </>
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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
