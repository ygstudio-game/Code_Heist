import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Shield, 
  LayoutDashboard, 
  Trophy, 
  LogOut, 
  Terminal, 
  Lock, 
  Menu, 
  X,
  Code,
  Zap,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { clearAuthToken } from '@/lib/api';
import { Team } from '@/types';

export default function Navbar() {
  const [team, setTeam] = useState<Team | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'r1' | 'r2' | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownTimer = useRef<NodeJS.Timeout | null>(null);

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

  const handleMouseEnter = (type: 'r1' | 'r2') => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(type);
  };

  const handleMouseLeave = () => {
    dropdownTimer.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  if (!team) return null;

  const isAdmin = team.role === 'ADMIN';

  const round1Links = isAdmin 
    ? [{ name: 'Admin Dashboard', href: '/admin', icon: <Shield size={14} /> }]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={14} /> },
        { name: 'Auction Room', href: '/auction', icon: <Terminal size={14} /> }
      ];

  const round2Links = isAdmin
    ? [{ name: 'Vault Admin', href: '/round2/admin', icon: <Shield size={14} /> }]
    : [{ name: 'My Vault', href: '/round2/team', icon: <Zap size={14} /> }];

  const publicLinks = [
    { name: 'Leaderboard', href: '/leaderboard', icon: <Trophy size={14} /> },
    { name: 'Vault Rankings', href: '/round2', icon: <Lock size={14} /> }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-background/60 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Role */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-sm rotate-45 group-hover:rotate-90 transition-all duration-500">
              <Code size={16} className="text-primary -rotate-45 group-hover:-rotate-90 transition-all duration-500" />
            </div>
            <span className="font-black text-lg uppercase tracking-tighter italic hidden sm:inline-block">
              Code<span className="text-primary">Heist</span>
            </span>
          </Link>

          <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] text-text/40 uppercase tracking-widest">{isAdmin ? 'Admin' : 'Team'}:</span>
            <span className="text-[10px] font-geist-mono text-primary font-bold px-2 py-0.5 bg-primary/5 border border-primary/20 rounded-sm">
              {team.name}
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Groups with Dropdowns */}
        <div className="hidden md:flex items-center gap-6">
          {/* Round 1 Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnter('r1')}
            onMouseLeave={handleMouseLeave}
          >
            <button className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm border ${activeDropdown === 'r1' || round1Links.some(l => l.href === pathname) ? 'text-primary border-primary/20 bg-primary/5' : 'text-text/40 hover:text-text'}`}>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
              Round 1
              <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'r1' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'r1' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-background/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {round1Links.map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-primary/10 text-primary' : 'text-text/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Round 2 Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnter('r2')}
            onMouseLeave={handleMouseLeave}
          >
            <button className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm border ${activeDropdown === 'r2' || [...round2Links, ...publicLinks].some(l => l.href === pathname) ? 'text-danger border-danger/20 bg-danger/5' : 'text-text/40 hover:text-text'}`}>
              <div className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse"></div>
              Round 2
              <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'r2' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'r2' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-background/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 text-[8px] text-text/30 uppercase tracking-[2px] border-b border-white/5 mb-1">Challenge Control</div>
                {round2Links.map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-danger/10 text-danger' : 'text-text/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}
                <div className="px-4 py-2 text-[8px] text-text/30 uppercase tracking-[2px] border-b border-white/5 my-1">Public Intel</div>
                {publicLinks.map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-white/10 text-white' : 'text-text/60 hover:text-white hover:bg-white/5'}`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Logout & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text/40 hover:text-danger hover:bg-danger/5 transition-all rounded-sm border border-transparent hover:border-danger/20"
          >
            <LogOut size={14} />
            <span className="hidden lg:inline">Logout</span>
          </button>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-text/60 hover:text-primary transition-colors"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-white/5 p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <div className="text-[10px] text-primary uppercase tracking-[4px] font-bold border-l-2 border-primary pl-3">
              Round 1 // Code Auction
            </div>
            <div className="grid grid-cols-1 gap-2">
              {round1Links.map(link => (
                <MobileNavLink key={link.href} href={link.href} icon={link.icon} onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </MobileNavLink>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] text-danger uppercase tracking-[4px] font-bold border-l-2 border-danger pl-3">
              Round 2 // Vault Escape
            </div>
            <div className="grid grid-cols-1 gap-2">
              {round2Links.map(link => (
                <MobileNavLink key={link.href} href={link.href} icon={link.icon} onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </MobileNavLink>
              ))}
              {publicLinks.map(link => (
                <MobileNavLink key={link.href} href={link.href} icon={link.icon} onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </MobileNavLink>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 bg-danger/5 border border-danger/20 text-danger text-[10px] font-bold uppercase tracking-[4px]"
            >
              <div className="flex items-center gap-2">
                <LogOut size={14} /> Logout
              </div>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Visual Identity Bar */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
    </nav>
  );
}

function MobileNavLink({ href, children, icon, onClick }: { href: string, children: React.ReactNode, icon: React.ReactNode, onClick: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-sm text-[10px] font-bold uppercase tracking-widest text-text/60 hover:border-primary/40 hover:text-primary transition-all"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
