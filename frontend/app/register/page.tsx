'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { UserPlus, ShieldPlus, ChevronRight, X } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAddMember = () => setMembers([...members, '']);
  const handleRemoveMember = (idx: number) => setMembers(members.filter((_, i) => i !== idx));
  const updateMember = (idx: number, val: string) => {
    const newMembers = [...members];
    newMembers[idx] = val;
    setMembers(newMembers);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.success('ACCESS GRANTED: Team link established.');
        router.push('/login');
      } else {
        toast.error(data.error || 'REGISTRATION REJECTED');
      }
    } catch (error) {
      toast.error('UPLINK FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden grid-bg-subtle">
      <div className="scanline"></div>
      <div className="particle-bg"></div>
      
      <div className="absolute inset-0 opacity-10 pointer-events-none grid-bg-subtle"></div>

      <div className="terminal-card w-full max-w-2xl z-10 p-12 border-white/5 animate-in fade-in zoom-in duration-700">
        <div className="flex justify-between items-start mb-12 border-b border-white/5 pb-8">
          <div>
            <div className="text-[10px] text-primary font-mono tracking-[4px] uppercase mb-3 glow-text">[ Operator Enlistment ]</div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Squad <span className="text-primary not-italic">Registration</span></h1>
            <p className="text-[10px] text-text/30 font-geist-mono uppercase tracking-[3px] mt-2 italic">Aegis Protocol // v1.2.0-secure</p>
          </div>
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 flex items-center justify-center text-primary/40">
            <UserPlus size={24} />
          </div>
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Squad Identity */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-primary/60 flex items-center gap-2 uppercase tracking-[3px] border-b border-white/5 pb-2">
               Core Identity
            </h3>
            <div className="space-y-4">
              <InputField label="Squad Callsign" value={name} onChange={setName} placeholder="PHANTOM_UNIT" />
              <InputField label="Access Key (Username)" value={accessKey} onChange={setAccessKey} placeholder="PHANTOM_77" />
              <InputField label="Operational Cipher (Password)" value={password} onChange={setPassword} type="password" placeholder="••••••••••••" />
            </div>
          </div>

          {/* Section 2: Operators */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-primary/60 flex items-center gap-2 uppercase tracking-[3px] border-b border-white/5 pb-2">
               Operator manifest
            </h3>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {members.map((member, idx) => (
                <div key={idx} className="flex gap-2 group">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateMember(idx, e.target.value)}
                    placeholder={`Operator ${idx + 1}`}
                    className="flex-1 bg-white/[0.02] border border-white/5 p-3 text-xs focus:border-primary/40 focus:bg-primary/5 outline-none transition-all font-geist-mono"
                    required={idx === 0}
                  />
                  {idx > 0 && (
                    <button type="button" onClick={() => handleRemoveMember(idx)} className="p-2 text-text/20 hover:text-danger hover:bg-danger/5 transition-all opacity-0 group-hover:opacity-100">
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
              + Add Field Agent
            </button>
          </div>

          <div className="md:col-span-2 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <Link href="/login" className="text-[9px] text-text/30 hover:text-primary transition-colors uppercase tracking-[4px] border-b border-transparent hover:border-primary/20 pb-1">
              Existing Link Authorization
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="terminal-button px-12 py-4 text-xs min-w-[200px]"
            >
              {isLoading ? 'Decrypting Payload...' : 'Execute Onboarding'}
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
