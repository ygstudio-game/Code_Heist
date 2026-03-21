'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Timer, Gavel, Shield, Terminal as TerminalIcon, TrendingUp, Users } from 'lucide-react';

export default function AuctionPage() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes mock
  const [currentBid] = useState(1500);
  const [highestBidder] = useState("PHANTOM_77");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-text">
       <div className="scanline"></div>
       <Navbar />
       
       <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[4px] uppercase">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                Uplink Active // Bidding War v4.0
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter italic">
                Aegis <span className="text-white/20">Auction</span>
              </h1>
            </div>
            
            <div className="flex gap-4">
               <div className="terminal-card py-2 px-6 flex items-center gap-4">
                  <Timer className="text-primary" size={20} />
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-mono leading-none">Time Remaining</p>
                    <p className="text-2xl font-black text-primary font-mono">{formatTime(timeLeft)}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Current Snippet Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="terminal-card min-h-[400px] flex flex-col justify-between group">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono uppercase tracking-widest">
                      Snippet #042 // High-Level Kernel Vulnerability
                    </div>
                    <Shield className="text-white/10" size={32} />
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold uppercase tracking-tight text-white/90">
                      Buffer Overflow Payload [C++]
                    </h2>
                    <p className="text-white/40 leading-relaxed max-w-xl">
                      A critical exploit targeting the system&apos;s memory management. 
                      Acquiring this fragment grants significant leverage in the upcoming Heist.
                    </p>
                  </div>
                </div>

                <div className="mt-12 bg-black/40 border border-white/5 p-6 rounded-sm font-geist-mono text-sm leading-relaxed overflow-x-auto">
                   <pre className="text-primary/70">
{`void exploit(char *target) {
  char buffer[512];
  // VULNERABILITY DETECTED
  memcpy(buffer, target, strlen(target)); 
  system(buffer);
}`}
                   </pre>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StatCard icon={<TrendingUp size={16} />} label="Total Bids" value="48" />
                 <StatCard icon={<Users size={16} />} label="Active Cells" value="12" />
                 <StatCard icon={<TerminalIcon size={16} />} label="Encryption" value="AES-256" />
              </div>
            </div>

            {/* Right: Bidding Console */}
            <div className="space-y-8">
              <div className="terminal-card border-primary/20 space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-white/40 uppercase font-mono tracking-[3px]">Current Valuation</p>
                  <p className="text-6xl font-black text-white italic tracking-tighter">
                    {currentBid}<span className="text-primary font-mono text-xl ml-2">CR</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-success/60 font-mono uppercase bg-success/5 py-1 rounded-full">
                     <TrendingUp size={12} /> +150 since last update
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                   <div className="flex justify-between items-center text-xs uppercase tracking-widest">
                      <span className="text-white/30">High Bidder</span>
                      <span className="text-primary font-bold">{highestBidder}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs uppercase tracking-widest">
                      <span className="text-white/30">Min Increase</span>
                      <span className="text-white/90">100 CR</span>
                   </div>
                </div>

                <div className="space-y-4 mt-8">
                   <div className="relative">
                      <input 
                        type="number" 
                        placeholder="ENTER BID AMOUNT..." 
                        className="w-full bg-black/60 border border-white/10 p-4 text-center font-mono text-xl focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono text-[10px]">AMT</div>
                   </div>
                   <button className="terminal-button w-full py-4 text-xl flex items-center justify-center gap-3 group">
                      <Gavel size={24} className="group-hover:rotate-[-45deg] transition-transform" />
                      SUBMIT BID
                   </button>
                </div>
              </div>

              {/* History list */}
              <div className="terminal-card p-0 overflow-hidden">
                 <div className="px-6 py-4 border-b border-white/5 bg-white/5 text-[10px] font-mono uppercase tracking-[3px] text-white/40">
                   Bidding History
                 </div>
                 <div className="divide-y divide-white/5">
                   <HistoryItem user="PHANTOM_77" amount={1500} time="2m ago" highlight />
                   <HistoryItem user="ZERO_DAY" amount={1400} time="5m ago" />
                   <HistoryItem user="GHOST_PROTO" amount={1350} time="8m ago" />
                   <HistoryItem user="PHANTOM_77" amount={1200} time="12m ago" />
                 </div>
              </div>
            </div>
          </div>
       </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="terminal-card p-4 space-y-2 bg-white/5 border-white/5">
       <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-mono leading-none">
          {icon}
          {label}
       </div>
       <div className="text-2xl font-black text-white/80">{value}</div>
    </div>
  );
}

function HistoryItem({ user, amount, time, highlight = false }: { user: string, amount: number, time: string, highlight?: boolean }) {
  return (
    <div className={`px-6 py-3 flex justify-between items-center ${highlight ? 'bg-primary/5' : ''}`}>
       <div className="space-y-1">
          <p className={`text-xs font-bold leading-none ${highlight ? 'text-primary' : 'text-white/70'}`}>{user}</p>
          <p className="text-[9px] text-white/20 uppercase font-mono">{time}</p>
       </div>
       <div className={`font-mono text-sm ${highlight ? 'text-primary glow-text' : 'text-white/50'}`}>
          {amount} CR
       </div>
    </div>
  );
}
