'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { Terminal } from 'lucide-react';

export default function LoginPage() {
  const [accessKey, setAccessKey] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.token);
        localStorage.setItem('team', JSON.stringify(data.team));
        // Set cookie for middleware
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
        toast.success('LINK ESTABLISHED: Welcome to the heist.');
        
        // Role-based routing
        if (data.team.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        toast.error(data.error || 'ACCESS DENIED');
      }
    } catch {
      toast.error('CONNECTION INTERRUPTED');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden grid-bg-subtle">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <div className="terminal-card w-full max-w-md z-10 p-12 border-white/5 animate-in fade-in zoom-in duration-700 ease-out">
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-primary/5 rounded-sm flex items-center justify-center mb-6 border border-primary/30 relative group overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <Terminal className="text-primary glow-text relative z-10" size={32} />
          </div>
          <h1 className="text-4xl font-black text-white glow-text tracking-widest uppercase italic">Aegis <span className="text-primary not-italic">Terminal</span></h1>
          <p className="text-[10px] text-text/30 mt-3 font-mono tracking-[4px] uppercase">Secure Link Authorization</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-primary/70 text-[9px] font-bold uppercase tracking-[3px]">Squad Access Key</label>
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="PHANTOM_77"
              className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-sm focus:border-primary/50 focus:bg-primary/5 outline-none text-text transition-all placeholder:opacity-20 text-sm font-geist-mono tracking-tight"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-primary/70 text-[9px] font-bold uppercase tracking-[3px]">Encrypted Secret</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-sm focus:border-primary/50 focus:bg-primary/5 outline-none text-text transition-all placeholder:opacity-20 text-sm font-geist-mono tracking-tight"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="terminal-button w-full mt-4 disabled:opacity-50 py-4 text-xs"
          >
            {isLoading ? 'Decrypting Uplink...' : 'Establish Connection'}
          </button>
        </form>

        <div className="mt-12 flex flex-col items-center gap-6">
          <Link href="/register" className="text-[9px] text-text/20 hover:text-primary transition-colors uppercase tracking-[4px] border-b border-transparent hover:border-primary/40 pb-1">
            Request Operational Link
          </Link>
          <div className="flex items-center gap-3 opacity-20">
            <div className="h-px w-8 bg-white"></div>
            <div className="text-[9px] text-white font-geist-mono uppercase tracking-[2px]">
              V4.2 // RSA_AES_ENCRYPTED
            </div>
            <div className="h-px w-8 bg-white"></div>
          </div>
        </div>
      </div>
    </div>
  );
}