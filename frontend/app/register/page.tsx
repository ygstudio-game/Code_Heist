'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { UserPlus, X, Download, CheckCircle2 } from 'lucide-react';

// Auto-generate a username from the team name
function generateUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredData, setRegisteredData] = useState<{
    name: string;
    accessKey: string;
    password: string;
    members: string[];
  } | null>(null);
  const router = useRouter();

  const accessKey = generateUsername(name);

  const handleAddMember = () => setMembers([...members, '']);
  const handleRemoveMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx));
  const updateMember = (idx: number, val: string) => {
    const newMembers = [...members];
    newMembers[idx] = val;
    setMembers(newMembers);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey) {
      toast.error('Please enter a team name to generate a username.');
      return;
    }
    setIsLoading(true);

    try {
      const filteredMembers = members.filter(m => m.trim() !== '');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, accessKey, password, members: filteredMembers }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Team registered successfully!');
        setRegisteredData({ name, accessKey, password, members: filteredMembers });
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCredentials = () => {
    if (!registeredData) return;
    const content = [
      `===== CODE HEIST - TEAM CREDENTIALS =====`,
      ``,
      `Team Name    : ${registeredData.name}`,
      `Username     : ${registeredData.accessKey}`,
      `Password     : ${registeredData.password}`,
      ``,
      `--- Team Members ---`,
      ...registeredData.members.map((m, i) => `  ${i + 1}. ${m}`),
      ``,
      `=====================================`,
      `Keep this file safe! You will need`,
      `the username and password to login.`,
      `=====================================`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${registeredData.accessKey}_credentials.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Success screen after registration
  if (registeredData) {
    return (
      <div className="min-h-screen bg-background relative flex items-start md:items-center justify-center p-4 md:p-6 overflow-y-auto grid-bg-subtle py-12 md:py-0">
        <div className="scanline"></div>
        <div className="particle-bg"></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none grid-bg-subtle"></div>

        <div className="terminal-card w-full max-w-md z-10 p-6 md:p-10 border-white/5 animate-in fade-in zoom-in duration-700">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-sm flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
              <CheckCircle2 className="text-primary" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">Team Created!</h1>
            <p className="text-text/40 text-[10px] uppercase tracking-widest">Save your login details before continuing</p>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-sm space-y-4 mb-8 font-geist-mono text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-text/40 text-[10px] uppercase tracking-widest">Team Name</span>
              <span className="text-white font-bold">{registeredData.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text/40 text-[10px] uppercase tracking-widest">Username</span>
              <span className="text-primary font-bold">{registeredData.accessKey}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-text/40 text-[10px] uppercase tracking-widest">Password</span>
              <span className="text-white font-bold">{registeredData.password}</span>
            </div>
            {registeredData.members.length > 0 && (
              <div className="pt-4 border-t border-white/5">
                <span className="text-text/40 text-[10px] uppercase tracking-widest block mb-2">Members</span>
                <div className="grid grid-cols-1 gap-1">
                  {registeredData.members.map((m, i) => (
                    <span key={i} className="text-white text-xs block opacity-80">{i + 1}. {m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleDownloadCredentials}
              className="terminal-button w-full py-4 text-xs flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Download Credentials
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 text-xs border border-white/10 text-text/60 hover:text-white hover:border-white/30 transition-all uppercase tracking-widest font-bold"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex items-start md:items-center justify-center p-4 md:p-6 overflow-y-auto grid-bg-subtle py-8 md:py-0">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <div className="absolute inset-0 opacity-10 pointer-events-none grid-bg-subtle"></div>

      <div className="terminal-card w-full max-w-2xl z-10 p-6 md:p-12 border-white/5 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-8 md:mb-12 border-b border-white/5 pb-8 gap-6 text-center md:text-left">
          <div>
            <div className="text-[10px] text-primary font-mono tracking-[4px] uppercase mb-3 glow-text">[ Team Registration ]</div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Create <span className="text-primary not-italic">Your Team</span></h1>
            <p className="text-[10px] text-text/30 font-geist-mono uppercase tracking-[3px] mt-2 italic">Aegis Team Setup // v1.2.0-secure</p>
          </div>
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 flex items-center justify-center text-primary/40 shrink-0">
            <UserPlus size={24} />
          </div>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Section 1: Team Details */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-primary/60 flex items-center gap-2 uppercase tracking-[3px] border-b border-white/5 pb-2">
               Team Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-primary/70 text-[9px] font-bold uppercase tracking-[3px]">Team Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your team name"
                  className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-sm focus:border-primary/50 focus:bg-primary/5 outline-none text-text transition-all placeholder:opacity-20 text-sm font-geist-mono"
                  required
                />
                {accessKey && (
                  <p className="text-[10px] text-text/40 font-geist-mono mt-1">
                    Your username: <span className="text-primary font-bold">{accessKey}</span>
                  </p>
                )}
              </div>
              <InputField label="Password" value={password} onChange={setPassword} type="password" placeholder="Enter a password" />
            </div>
          </div>

          {/* Section 2: Team Members */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-primary/60 flex items-center gap-2 uppercase tracking-[3px] border-b border-white/5 pb-2">
               Team Members
            </h3>
            
            <div className="space-y-3 max-h-[220px] md:max-h-[none] overflow-y-auto md:overflow-visible pr-2 md:pr-0 custom-scrollbar">
              {members.map((member, idx) => (
                <div key={idx} className="flex gap-2 group">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateMember(idx, e.target.value)}
                    placeholder={`Member ${idx + 1}`}
                    className="flex-1 bg-white/[0.02] border border-white/5 p-3 text-xs focus:border-primary/40 focus:bg-primary/5 outline-none transition-all font-geist-mono"
                    required={idx === 0}
                  />
                  {idx > 0 && (
                    <button type="button" onClick={() => handleRemoveMember(idx)} className="p-2 text-text/20 hover:text-danger hover:bg-danger/5 transition-all md:opacity-0 md:group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              type="button" 
              onClick={handleAddMember}
              className="w-full py-3 border border-dashed border-white/10 text-[9px] text-text/30 uppercase hover:border-primary/40 hover:text-primary transition-all font-bold tracking-widest"
            >
              + Add Another Member
            </button>
          </div>

          <div className="md:col-span-2 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <Link href="/login" className="text-[9px] text-text/30 hover:text-primary transition-colors uppercase tracking-[4px] border-b border-transparent hover:border-primary/20 pb-1 text-center md:text-left">
              Already have an account? Login here
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="terminal-button w-full md:w-auto px-12 py-4 text-xs min-w-[200px]"
            >
              {isLoading ? 'Creating Team...' : 'Register Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: { label: string, value: string, onChange: (val: string) => void, type?: string, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-primary/70 text-[9px] font-bold uppercase tracking-[3px]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 p-4 rounded-sm focus:border-primary/50 focus:bg-primary/5 outline-none text-text transition-all placeholder:opacity-20 text-sm font-geist-mono"
        required
      />
    </div>
  );
}
