import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Player from './Player';
import MobileSidebar from './MobileSidebar';

export default function Layout() {
  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[hsl(var(--background))]">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--sidebar-bg))]">
        <MobileSidebar />
        <span className="text-base font-bold gradient-text">LLL Music</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-col w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {/* Persistent bottom player */}
      <Player />
    </div>
  );
}
