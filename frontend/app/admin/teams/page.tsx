'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { fetchWithAuth } from '@/lib/api';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Key, 
  Shield, 
  Search, 
  Plus, 
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

interface TeamMember {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  accessKey: string;
  role: string;
  credits: number;
  strikes: number;
  members: TeamMember[];
  _count: {
    submissions: number;
    bids: number;
  };
  createdAt: string;
}

// Auto-generate username from team name
function generateUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const { socket, isConnected } = useSocket();

  // Create Form State
  const [newTeam, setNewTeam] = useState({
    name: '',
    password: '',
    members: ['', '']
  });

  // Reset Password State
  const [resetPassword, setResetPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/admin/teams-list');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on('teams:reload', fetchTeams);
      return () => {
        socket.off('teams:reload', fetchTeams);
      };
    }
  }, [isConnected, socket, fetchTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessKey = generateUsername(newTeam.name);
    if (!accessKey) {
      notify('error', 'Please enter a team name.');
      return;
    }
    try {
      const res = await fetchWithAuth('/admin/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeam.name,
          accessKey,
          password: newTeam.password,
          members: newTeam.members.filter(m => m.trim() !== '')
        })
      });

      if (res.ok) {
        notify('success', 'Team created!');
        setShowCreateModal(false);
        setNewTeam({ name: '', password: '', members: ['', ''] });
        fetchTeams();
      } else {
        const data = await res.json();
        notify('error', data.error || 'Failed to create team.');
      }
    } catch {
      notify('error', 'Network error.');
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete team: ${name}?`)) return;

    try {
      const res = await fetchWithAuth(`/admin/teams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('success', 'Team deleted.');
        fetchTeams();
      } else {
        notify('error', 'Failed to delete team.');
      }
    } catch {
      notify('error', 'Network error.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;

    try {
      const res = await fetchWithAuth(`/admin/teams/${showResetModal}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPassword })
      });

      if (res.ok) {
        notify('success', 'Password updated.');
        setShowResetModal(null);
        setResetPassword('');
      } else {
        notify('error', 'Failed to update password.');
      }
    } catch {
      notify('error', 'Network error.');
    }
  };

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.accessKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary selection:text-black">
      <Navbar />
      
      <main className="pt-36 md:pt-40 pb-12 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center rounded-sm">
                <Users className="text-primary" size={20} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">
                Team <span className="text-primary">Management</span>
              </h1>
            </div>
            <p className="text-text/40 text-[10px] uppercase tracking-[4px] font-bold">
              Manage All Teams
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text/20 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/[0.03] border border-white/5 pl-10 pr-4 py-2.5 rounded-sm text-[10px] font-bold tracking-widest focus:outline-none focus:border-primary/40 focus:bg-primary/5 transition-all w-full md:w-64"
              />
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-black px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-[2px] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              <UserPlus size={16} />
              Create Team
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard label="Total Teams" value={teams.length} icon={<Users size={16} />} color="primary" />
          <StatCard label="Total Members" value={teams.reduce((acc, t) => acc + t.members.length, 0)} icon={<Shield size={16} />} color="danger" />
          <StatCard label="Total Answers" value={teams.reduce((acc, t) => acc + t._count.submissions, 0)} icon={<Plus size={16} />} color="primary" />
          <StatCard label="Total Bids" value={teams.reduce((acc, t) => acc + t._count.bids, 0)} icon={<Key size={16} />} color="danger" />
        </div>

        {/* Teams Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[2px] text-text/40">Team Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[2px] text-text/40">Username</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[2px] text-text/40 text-center">Credits</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[2px] text-text/40 text-center">Activity</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[2px] text-text/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold uppercase tracking-[4px] text-text/20">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center text-text/20 uppercase text-xs font-bold tracking-widest">
                      No teams found
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr key={team.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm group-hover:scale-110 transition-transform">
                            {team.name ? team.name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="text-xs font-black tracking-tight mb-0.5 group-hover:text-primary transition-colors">{team.name}</div>
                            <div className="flex gap-1">
                              {team.members.map((m, i) => (
                                <span key={i} className="text-[8px] text-text/30 font-bold py-0.5 px-1 bg-white/5 rounded-[2px]">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <code className="text-[10px] font-geist-mono text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                            {team.accessKey}
                          </code>
                          <span className="text-[8px] text-text/20 uppercase tracking-widest">{team.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black text-primary">{team.credits}</span>
                          <span className="text-[8px] text-text/30 uppercase font-bold tracking-widest">Credits</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-text/60">{team._count.submissions}</span>
                            <span className="text-[8px] text-text/20 uppercase font-bold">Answers</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-text/60">{team.strikes}</span>
                            <span className={`text-[8px] uppercase font-bold ${team.strikes > 0 ? 'text-danger' : 'text-text/20'}`}>Strikes</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setShowResetModal(team.id)}
                            className="p-2 bg-white/5 border border-white/5 rounded-sm text-text/40 hover:text-primary hover:border-primary/20 transition-all hover:bg-primary/5"
                            title="Reset Password"
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="p-2 bg-white/5 border border-white/5 rounded-sm text-text/40 hover:text-danger hover:border-danger/20 transition-all hover:bg-danger/5"
                            title="Delete Team"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-sm border shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 ${
          notification.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-[10px] font-black uppercase tracking-[2px]">{notification.message}</span>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-background border border-white/10 w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Create <span className="text-primary">Team</span></h3>
                <p className="text-[8px] text-text/30 uppercase tracking-[3px] font-bold">Add a new team</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-text/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] text-text/40 uppercase tracking-[2px] font-black">Team Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Enter team name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-sm p-4 text-sm focus:outline-none focus:border-primary/40 transition-all font-geist-mono"
                />
                {newTeam.name && (
                  <p className="text-[10px] text-text/40 font-geist-mono">
                    Username: <span className="text-primary font-bold">{generateUsername(newTeam.name)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[8px] text-text/40 uppercase tracking-[2px] font-black">Password</label>
                <div className="relative">
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={newTeam.password}
                    onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-sm p-4 pr-12 text-sm focus:outline-none focus:border-primary/40 transition-all font-geist-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text/20 hover:text-primary transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[8px] text-text/40 uppercase tracking-[2px] font-black">Team Members</label>
                {newTeam.members.map((member, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      type="text"
                      placeholder={`Member ${i + 1}`}
                      value={member}
                      onChange={(e) => {
                        const m = [...newTeam.members];
                        m[i] = e.target.value;
                        setNewTeam({ ...newTeam, members: m });
                      }}
                      className="flex-1 bg-white/[0.03] border border-white/5 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-white/10 transition-all font-geist-mono"
                    />
                    {newTeam.members.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const m = newTeam.members.filter((_, idx) => idx !== i);
                          setNewTeam({ ...newTeam, members: m });
                        }}
                        className="p-3 text-danger/40 hover:text-danger hover:bg-danger/5 transition-all rounded-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setNewTeam({ ...newTeam, members: [...newTeam.members, ''] })}
                  className="text-[8px] font-black uppercase tracking-[2px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 px-1 py-1"
                >
                  <Plus size={10} /> Add Member
                </button>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-4 rounded-sm text-[10px] font-black uppercase tracking-[2px] border border-white/5 text-text/40 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-sm text-[10px] font-black uppercase tracking-[2px] bg-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-background border border-white/10 w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Reset <span className="text-danger">Password</span></h3>
                <p className="text-[8px] text-text/30 uppercase tracking-[3px] font-bold">Change Password</p>
              </div>
              <button 
                onClick={() => setShowResetModal(null)}
                className="text-text/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] text-text/40 uppercase tracking-[2px] font-black">New Password</label>
                <div className="relative">
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-sm p-4 pr-12 text-sm focus:outline-none focus:border-danger/40 transition-all font-geist-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text/20 hover:text-danger transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="flex-1 px-6 py-4 rounded-sm text-[10px] font-black uppercase tracking-[2px] border border-white/5 text-text/40 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-sm text-[10px] font-black uppercase tracking-[2px] bg-danger text-white shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: 'primary' | 'danger' }) {
  const colorClasses = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    danger: 'bg-danger/10 border-danger/20 text-danger',
  };

  const glowClasses = {
    primary: 'bg-primary',
    danger: 'bg-danger',
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={`absolute top-0 right-0 w-24 h-24 translate-x-12 -translate-y-12 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${glowClasses[color]}`}></div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-sm border ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-text/40">{label}</span>
      </div>
      <div className="text-3xl font-black italic tracking-tighter">{value}</div>
    </div>
  );
}
