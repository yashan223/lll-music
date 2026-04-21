import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Music2, Upload, ListMusic, Heart, Clock, LogOut, LogIn, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import usePwaInstall from '../hooks/usePwaInstall';

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isStandalone, promptInstall } = usePwaInstall();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  const handleInstallClick = async () => {
    const result = await promptInstall();

    if (result.status === 'ios') {
      window.alert('On iPhone: tap Share in Safari, then tap Add to Home Screen.');
      return;
    }

    if (result.status === 'unavailable') {
      window.alert('Install is not available yet in this browser session. Try opening in Safari or Chrome.');
    }

    setOpen(false);
  };

  let navItems = [
    { to: '/', label: 'Library', icon: Music2, end: true },
  ];

  if (user) {
    navItems = [
      ...navItems,
      { to: '/recent', label: 'Recently Played', icon: Clock },
      { to: '/favorites', label: 'Favorites', icon: Heart },
      { to: '/playlists', label: 'Playlists', icon: ListMusic },
      { to: '/upload', label: 'Upload Music', icon: Upload },
    ];
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))] flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Music2 size={16} className="text-white" />
            </div>
            <span className="font-bold gradient-text">LLL Music</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-transparent'
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-purple-400 hover:bg-[hsl(var(--accent))] transition-all group border border-transparent"
            >
              <Download size={18} className="group-hover:text-purple-400 transition-colors" />
              <span>Add to Home</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-[hsl(var(--border))]">
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Admin Mode</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2 py-1 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-purple-400 transition-colors group"
            >
              <LogIn size={18} className="group-hover:text-purple-400 transition-colors" />
              <span>Admin Login</span>
            </NavLink>
          )}
        </div>
      </div>
    </>
  );
}
