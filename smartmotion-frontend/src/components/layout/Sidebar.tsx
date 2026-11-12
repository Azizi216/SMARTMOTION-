import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  Activity, BarChart3, Camera, ChevronLeft, ChevronRight, ClipboardList, Dumbbell,
  LayoutDashboard, Menu, Settings, ShieldCheck, Users, X, Footprints,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/live', label: 'Live Monitoring', icon: Camera },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/walking', label: 'Walking Analysis', icon: Footprints },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/reports', label: 'Progress Reports', icon: BarChart3 },
  { to: '/sessions', label: 'Session History', icon: ClipboardList },
];

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" onClick={onMobileClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-900 text-white transition-all duration-200 ${collapsed ? 'w-[78px]' : 'w-[252px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`flex h-[82px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          <NavLink to="/" className="flex items-center gap-3" onClick={onMobileClose}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 shadow-lg shadow-teal-500/20"><Activity size={21} strokeWidth={2.5} /></span>
            {!collapsed && <span className="font-display text-lg font-bold tracking-tight">Smart<span className="text-teal-400">Motion</span></span>}
          </NavLink>
          {!collapsed && <button onClick={onMobileClose} className="rounded-lg p-1.5 text-navy-300 hover:bg-white/10 lg:hidden"><X size={18} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-6 scroll-area">
          <p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-400 ${collapsed ? 'text-center' : ''}`}>{collapsed ? '·' : 'Workspace'}</p>
          <nav className="space-y-1">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={onMobileClose} title={collapsed ? label : undefined} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
                <Icon size={18} strokeWidth={1.8} />
                {!collapsed && <span>{label}</span>}
                {!collapsed && label === 'Live Monitoring' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />}
              </NavLink>
            ))}
          </nav>
          <p className={`mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-400 ${collapsed ? 'text-center' : ''}`}>{collapsed ? '·' : 'System'}</p>
          <NavLink to="/settings" onClick={onMobileClose} title={collapsed ? 'Settings' : undefined} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}><Settings size={18} strokeWidth={1.8} />{!collapsed && <span>Settings</span>}</NavLink>
        </div>
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-500 text-sm font-bold">{(user?.full_name || 'U').slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.full_name || 'Doctor'}</p><p className="truncate text-xs text-navy-300">{user?.email}</p></div><button onClick={() => { logout(); navigate('/login'); }} className="rounded-lg p-2 text-navy-300 hover:bg-white/10" title="Sign out">↪</button></div> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-500 text-sm font-bold">{(user?.full_name || 'U').slice(0,2).toUpperCase()}</div>}
        </div>
        <button onClick={() => setCollapsed((v) => !v)} className="absolute -right-3 top-[72px] hidden h-6 w-6 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 shadow-md lg:flex" aria-label="Toggle sidebar">{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="rounded-xl p-2 text-navy-700 hover:bg-navy-50 lg:hidden" aria-label="Open menu"><Menu size={22} /></button>; }
