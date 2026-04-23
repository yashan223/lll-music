import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Music2,
  Upload,
  ListMusic,
  Heart,
  Clock,
  LogOut,
  User,
  ChevronRight,
  LogIn,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import usePwaInstall from '../hooks/usePwaInstall';

export default function Sidebar() {
  const [iosToast, setIosToast] = useState(false);
  const { user, logout } = useAuth();
  const { isStandalone, isIos, canPromptInstall, promptInstall } = usePwaInstall();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleInstallClick = async () => {
    const result = await promptInstall();

    if (result.status === 'ios-share-opened') {
      return;
    }

    if (result.status === 'ios') {
      setIosToast(true);
      setTimeout(() => setIosToast(false), 5000);
      return;
    }
    // 'accepted', 'dismissed', or 'unavailable' — nothing to do
  };

  // Base items visible to everyone
  let navItems = [
    { to: '/', label: 'Library', icon: Music2, end: true },
  ];

  // Items only visible to admin/logged-in users
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
    <aside className="flex flex-col w-64 min-h-full bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))]">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
          <Music2 size={20} className="text-white" />
        </div>
        <span className="text-xl font-bold gradient-text tracking-tight">LLL Music</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-purple-400' : 'group-hover:text-purple-400'
                  )}
                />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-purple-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer block */}
      <div className="p-3 border-t border-[hsl(var(--border))]">
        {!isStandalone && (canPromptInstall || isIos) && (
          <>
            <button
              type="button"
              onClick={handleInstallClick}
              className="mb-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-purple-400 hover:bg-[hsl(var(--accent))] transition-all group border border-transparent"
            >
              <Download size={18} className="group-hover:text-purple-400 transition-colors" />
              <span>Add to Home</span>
            </button>
            {iosToast && (
              <p className="mb-2 text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-3 py-2 leading-snug">
                Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
              </p>
            )}
          </>
        )}

        {user ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                {user.username}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">Admin Mode</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-purple-400 hover:bg-[hsl(var(--accent))] transition-all group border border-transparent"
          >
            <LogIn size={18} className="group-hover:text-purple-400 transition-colors" />
            <span>Admin Login</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}
