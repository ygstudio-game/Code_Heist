'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, Trophy, LogOut, Terminal } from 'lucide-react';
import { clearAuthToken } from '@/lib/api';

import { Team } from '@/types';

export default function Navbar() {
  const [team, setTeam] = useState<Team | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedTeam = localStorage.getItem('team');
    if (savedTeam && !team) {
      setTimeout(() => {
        setTeam(JSON.parse(savedTeam));
      }, 0);
    }
  }, [team]);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('team');
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push('/login');
  };

  if (!team) return null;

  const isAdmin = team.role === 'ADMIN';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-background/40 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-6 text-white">
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold tracking-wide uppercase text-white/60">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Home
            </Link>
            <Link href="/auction" className="hover:text-primary transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Auction
            </Link>
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Dashboard
            </Link>
            <Link href="/leaderboard" className="hover:text-primary transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Leaderboard
            </Link>
          </div>

          <div className="h-4 w-px bg-white/10 mx-2"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text/40 uppercase tracking-widest">Team:</span>
            <span className="text-[10px] font-geist-mono text-primary font-bold px-2 py-0.5 bg-primary/5 border border-primary/20 rounded-sm">
              {team.name}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1 md:gap-4">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={14} />} active={pathname === '/dashboard'}>
            Dashboard
          </NavLink>
          <NavLink href="/auction" icon={<Shield size={14} />} active={pathname === '/auction'}>
            Auction Room
          </NavLink>
          <NavLink href="/leaderboard" icon={<Trophy size={14} />} active={pathname === '/leaderboard'}>
            Rankings
          </NavLink>

          {isAdmin && (
            <NavLink href="/admin" icon={<Shield size={14} />} active={pathname === '/admin'} variant="primary">
              Admin Panel
            </NavLink>
          )}

          <div className="h-6 w-px bg-white/5 mx-2"></div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text/40 hover:text-danger hover:bg-danger/5 transition-all rounded-sm"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Visual Identity Bar */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
    </nav>
  );
}

function NavLink({ href, children, icon, active, variant = 'default' }: { href: string, children: React.ReactNode, icon: React.ReactNode, active: boolean, variant?: string }) {
  const baseStyles = "flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm border";
  const activeStyles = active
    ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,229,255,0.1)]"
    : "border-transparent text-text/40 hover:text-text hover:bg-white/5";

  const primaryStyles = variant === 'primary' && !active
    ? "text-primary/70 border-primary/20 hover:border-primary/50 bg-primary/5"
    : "";

  return (
    <Link href={href} className={`${baseStyles} ${activeStyles} ${primaryStyles}`}>
      {icon}
      <span className="hidden lg:inline">{children}</span>
    </Link>
  );
}
