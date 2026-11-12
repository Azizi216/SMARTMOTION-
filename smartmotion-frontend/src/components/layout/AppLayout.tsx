import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="min-h-screen bg-canvas"><Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} /><TopBar onMenu={() => setMobileOpen(true)} /><main className="min-h-[calc(100vh-82px)] lg:ml-[252px]"><div className="mx-auto max-w-[1600px] p-4 md:p-8"><Outlet /></div></main></div>;
}
