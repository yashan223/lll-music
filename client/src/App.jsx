import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Library from './pages/Library';
import Upload from './pages/Upload';
import Playlists from './pages/Playlists';
import Favorites from './pages/Favorites';
import RecentlyPlayed from './pages/RecentlyPlayed';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

// Ensure logged-in users don't see login screen
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <Routes>
            {/* Login explicitly protected by lack of auth */}
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

            {/* Application shell */}
            <Route path="/" element={<Layout />}>
              {/* Public route */}
              <Route index element={<Library />} />
              
              {/* Admin-only / Protected Routes */}
              <Route path="upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
              <Route path="favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
              <Route path="recent" element={<ProtectedRoute><RecentlyPlayed /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
