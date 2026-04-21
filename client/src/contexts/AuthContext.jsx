import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('lll_music_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('lll_music_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI
      .getMe()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('lll_music_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        // Token expired or invalid
        logout();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('lll_music_token', token);
    localStorage.setItem('lll_music_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async ({ username, email, password }) => {
    const res = await authAPI.register({ username, email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('lll_music_token', token);
    localStorage.setItem('lll_music_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('lll_music_token');
    localStorage.removeItem('lll_music_user');
    setUser(null);
  };

  const updateFavorites = (songId, liked) => {
    if (!user) return;
    setUser((prev) => {
      const favorites = liked
        ? [...(prev.favorites || []), songId]
        : (prev.favorites || []).filter((id) => id !== songId && id?._id !== songId);
      const updated = { ...prev, favorites };
      localStorage.setItem('lll_music_user', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (songId) => {
    if (!user?.favorites) return false;
    return user.favorites.some((id) =>
      typeof id === 'string' ? id === songId : id?._id === songId || id?.id === songId
    );
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateFavorites, isFavorite }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
