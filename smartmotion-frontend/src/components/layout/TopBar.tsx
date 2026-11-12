import { Bell, Camera, ChevronDown, Menu, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { MobileMenuButton } from './Sidebar';

const titles: Record<string, string> = {
  '/': 'Overview', '/live': 'Live Monitoring', '/exercises': 'Exercises', '/walking': 'Walking Analysis',
  '/patients': 'Patients', '/reports': 'Progress Reports', '/sessions': 'Session History', '/settings': 'Settings',
};

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'SmartMotion';
  return <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-navy-100 bg-white/90 px-4 backdrop-blur md:px-8 lg:ml-[252px]">
    <div className="flex items-center gap-3"><MobileMenuButton onClick={onMenu} /><div><p className="text-xs font-medium text-navy-400">Workspace</p><h1 className="text-xl font-bold text-navy-900 md:text-2xl">{title}</h1></div></div>
    <div className="flex items-center gap-2 md:gap-4"><div className="hidden items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/50 px-3 py-2 text-xs font-medium text-navy-500 md:flex"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" /></span>Local processing active</div><button className="relative rounded-xl p-2.5 text-navy-500 hover:bg-navy-50"><Bell size={19} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-error-500" /></button><div className="hidden h-8 w-px bg-navy-100 sm:block" /><button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-navy-50"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">DR</div><ChevronDown size={15} className="hidden text-navy-400 sm:block" /></button></div>
  </header>;
}

export function PageSearch({ placeholder = 'Search...' }: { placeholder?: string }) { return <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm text-navy-400"><Search size={16} /><input className="w-28 bg-transparent outline-none placeholder:text-navy-300 sm:w-44" placeholder={placeholder} /></div>; }

export function ConnectionPill({ connected = false }: { connected?: boolean }) { return <span className={`badge ${connected ? 'bg-teal-50 text-teal-700' : 'bg-navy-50 text-navy-500'}`}><Camera size={12} />{connected ? 'Camera connected' : 'Camera offline'}</span>; }
