'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Timer, Gavel, Shield, Terminal as TerminalIcon, TrendingUp, Users } from 'lucide-react';
import { useAuction, AuctionBid } from '@/hooks/useAuction';
import { toast } from 'sonner';
import MonacoEditor from '@/components/MonacoEditor';

export default function AuctionPage() {
  const { 
    active, 
    auction, 
    history, 
    isLoading, 
    inactivityTimeLeft,
    placeBid 
  } = useAuction();
  
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBid = auction?.highestBid?.amount || 0;
  const highestBidder = auction?.highestBid?.team.name || "NO BIDS YET";
  const minIncrease = currentBid === 0 ? 250 : 50; 
  const recommendedBid = currentBid === 0 ? 250 : currentBid + minIncrease;

  const handleBidSubmit = async (customAmount?: number) => {
    const amount = customAmount || parseInt(bidAmount);
    if (isNaN(amount) || amount < recommendedBid) {
      toast.error(`MINIMUM BID REQUIRED: ${recommendedBid} CR`);
      return;
    }
    
    setIsSubmitting(true);
    const success = await placeBid(amount);
    if (success) setBidAmount('');
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (active && auction && !bidAmount) {
      setBidAmount(recommendedBid.toString());
    }
  }, [active, auction, recommendedBid, bidAmount]);

  return (
    <div className="min-h-screen bg-background text-text font-space">
       <div className="scanline"></div>
       <Navbar />
       
       <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 pt-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-mono text-sm font-semibold uppercase">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                Live Problem Auction
              </div>
              <h1 className="text-4xl font-bold uppercase tracking-tight">
                Problem <span className="text-white/20">Bidding</span>
              </h1>
            </div>
            
            <div className="flex gap-4">
               <div className="terminal-card py-2 px-6 flex items-center gap-4 border-primary/20 bg-primary/5">
                  <Timer className={active ? "text-primary animate-pulse" : "text-text/30"} size={20} />
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-mono leading-none">Time Remaining</p>
                    <p className={`text-2xl font-black font-mono ${active && auction?.timeLeft && auction.timeLeft <= 10 ? 'text-danger animate-pulse' : 'text-primary'}`}>
                      {active ? formatTime(auction?.timeLeft || 0) : '0:00'}
                    </p>
                  </div>
               </div>
               {inactivityTimeLeft !== null && inactivityTimeLeft > 0 && (
                 <div className="terminal-card py-2 px-6 flex items-center gap-4 border-danger/30 bg-danger/5 animate-pulse">
                    <Gavel className="text-danger" size={20} />
                    <div>
                      <p className="text-[10px] text-danger/60 uppercase font-mono leading-none">Closing In</p>
                      <p className="text-2xl font-black font-mono text-danger">
                        {inactivityTimeLeft}s
                      </p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !active || !auction ? (
            <div className="terminal-card min-h-[400px] flex items-center justify-center border-white/5 bg-white/[0.02]">
              <div className="text-center space-y-6 max-w-lg">
                <Shield className="w-16 h-16 text-white/10 mx-auto" />
                <h2 className="text-2xl font-bold text-white/40">Waiting for Auction</h2>
                <p className="text-text/60 text-base leading-relaxed">
                  No active problem auction at the moment.<br/>
                  Please wait for the admin to start the next round.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
              {/* Left Column: Problem Details & Code Viewer */}
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
                <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-left-8 duration-500 delay-75">
                  <div className="flex justify-between items-start gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold uppercase shrink-0">
                        Problem ID: {auction.snippet.id.slice(0, 8)}
                    </div>
                    {auction.isPreview && (
                      <div className="px-4 py-1 bg-warning/10 border border-warning/20 text-warning text-[10px] md:text-sm font-bold uppercase animate-pulse">
                        Preview Round - Bidding Locked
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-12 p-4 bg-primary/5 border border-primary/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Users size={14} />
                      </div>
                      <div>
                        <p className="text-[8px] text-text/40 uppercase font-mono tracking-widest leading-none">High Bidder</p>
                        <p className="text-xs md:text-sm font-bold text-white uppercase truncate max-w-[100px] md:max-w-[200px]">{highestBidder}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] text-text/40 uppercase font-mono tracking-widest leading-none">Current Bid</p>
                       <p className="text-lg md:text-xl font-black text-primary font-mono lowercase">{currentBid} <span className="text-[10px]">cr</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Bidding Console & History */}
              <div className="col-span-1 lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 delay-150 relative z-20">
                <div className={`terminal-card space-y-8 p-8 ${auction.isPreview ? 'border-warning/20 bg-warning/5' : 'border-primary/20 bg-primary/5'}`}>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white uppercase">Bid on Problem</h3>
                    <p className="text-sm text-text/60">Credits required to purchase this problem.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="relative group">
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-mono text-sm">CR</div>
                       <input 
                         type="number"
                         value={bidAmount}
                         onChange={(e) => setBidAmount(e.target.value)}
                         placeholder={recommendedBid.toString()}
                         className="w-full bg-black/60 border border-white/10 p-5 pl-12 text-3xl font-black font-mono text-primary outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                       />
                       <div className="flex justify-between mt-2 font-mono text-[9px] uppercase tracking-widest opacity-40">
                          <span>Min: {currentBid === 0 ? '250' : '+50'} Units</span>
                          <span>Next: {recommendedBid} CR</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                         onClick={() => handleBidSubmit(recommendedBid)}
                         disabled={isSubmitting || auction.isPreview}
                         className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-white/60"
                      >
                         Min Bid ({recommendedBid})
                      </button>
                      <button 
                         onClick={() => handleBidSubmit(recommendedBid + 100)}
                         disabled={isSubmitting || auction.isPreview}
                         className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-white/60"
                      >
                         Add +100
                      </button>
                    </div>

                    <button 
                      onClick={() => handleBidSubmit()}
                      disabled={isSubmitting || auction.isPreview || !bidAmount || parseInt(bidAmount) < recommendedBid}
                      className="terminal-button w-full py-5 text-xl flex items-center justify-center gap-3 group disabled:opacity-20 disabled:grayscale transition-all shadow-[0_0_30px_rgba(0,229,255,0.1)] hover:shadow-[0_0_40px_rgba(0,229,255,0.2)]"
                    >
                      <Gavel size={24} className="group-hover:rotate-[-45deg] transition-transform" />
                      <span className="relative z-10 uppercase font-black italic tracking-wider">Place Bid</span>
                    </button>
                  </div>

                  {auction.isPreview && (
                    <div className="p-4 border border-warning/20 bg-warning/10 text-sm text-center text-warning/80 font-bold uppercase">
                       Bidding is temporarily locked for preview
                    </div>
                  )}
                </div>

                {/* History Section */}
                <div className="terminal-card p-0 border-white/5 overflow-hidden">
                   <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                     <span className="text-sm font-bold uppercase text-white/60">Bid History</span>
                     <TrendingUp size={16} className="text-primary/60" />
                   </div>
                   <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                     {history && history.length > 0 ? (
                       history.map((bid: AuctionBid, idx: number) => (
                         <div key={bid.id} className={`px-6 py-4 flex justify-between items-center group transition-colors ${idx === 0 ? 'bg-primary/[0.03]' : 'hover:bg-white/[0.01]'}`}>
                           <div className="space-y-1">
                             <p className={`text-sm font-bold uppercase italic tracking-tight ${idx === 0 ? 'text-primary' : 'text-white/80'}`}>{bid.team.name}</p>
                             <p className="text-[8px] text-white/20 font-mono">{new Date(bid.createdAt).toLocaleTimeString()}</p>
                           </div>
                           <div className={`text-lg font-black font-mono ${idx === 0 ? 'text-primary glow-text' : 'text-white/40'}`}>
                             {bid.amount} <span className="text-[9px]">CR</span>
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="p-12 text-center text-xs text-text/20 font-mono uppercase tracking-widest italic">
                         No Bids Synchronized...
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          )}
       </main>

       <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
       `}</style>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 space-y-3 hover:border-primary/20 transition-all">
       <div className="flex items-center gap-2 text-[8px] text-text/40 uppercase font-mono tracking-[2px]">
          {icon}
          {label}
       </div>
       <div className="text-xl font-bold text-white tracking-tight uppercase italic">{value}</div>
    </div>
  );
}
