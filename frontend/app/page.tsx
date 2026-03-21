'use client';

import Link from 'next/link';
import { Shield, Lock, Terminal as TerminalIcon } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <div className="absolute inset-0 grid-bg-subtle opacity-10 pointer-events-none"></div>

      <div className="z-10 max-w-4xl w-full text-center space-y-16">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 text-primary text-[10px] font-mono tracking-[6px] uppercase mb-8 glow-text animate-pulse">
            [ Aegis Protocol Online ]
          </div>
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase leading-[0.8]">
            Code <span className="shimmer-text italic shadow-primary/20">Heist</span>
          </h1>
          <p className="text-lg md:text-2xl text-text/40 max-w-2xl mx-auto font-light leading-relaxed tracking-tight">
            The vault is sealed. The payloads are ready. 
            Only the <span className="text-primary italic font-bold">elite</span> will bypass the Aegis firewall.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-1000 delay-500">
          <FeatureCard 
            icon={<Lock className="text-primary opacity-60" size={24} />} 
            title="Encrypted Ops" 
            desc="Solve algorithmic vulnerabilities to extract system credits." 
          />
          <FeatureCard 
            icon={<Shield className="text-primary opacity-60" size={24} />} 
            title="Bidding War" 
            desc="Use your credits to acquire high-value code fragments." 
          />
          <FeatureCard 
            icon={<TerminalIcon className="text-primary opacity-60" size={24} />} 
            title="Command Port" 
            desc="A premium dark terminal environment for technical superiority." 
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 animate-in fade-in slide-in-from-top-12 duration-1000 delay-700">
          <Link href="/login" className="terminal-button text-xl px-16 py-5 group">
            <span className="relative z-10">Initialize Access</span>
          </Link>
          <div className="text-[10px] text-text/20 font-geist-mono uppercase tracking-[5px] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            v1.2.0-secure // entry-restricted
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="terminal-card group hover:translate-y-[-4px] transition-all flex flex-col gap-6">
      <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all relative">
        {icon}
        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      <div>
        <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tighter italic">{title}</h3>
        <p className="text-xs text-text/50 leading-relaxed font-light uppercase tracking-tight">{desc}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}
