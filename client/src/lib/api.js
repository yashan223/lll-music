import axios from 'axios';

const FIRST_PARTY_HOST_PATTERN = /(^|\.)xoxod33p\.me$/i;
const isBrowser = typeof window !== 'undefined';
const currentHost = isBrowser ? window.location.hostname : '';
const useRelativeApiBase = import.meta.env.DEV || (isBrowser && !FIRST_PARTY_HOST_PATTERN.test(currentHost));

const API_BASE = (useRelativeApiBase
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://musicapi.xoxod33p.me/api')
).replace(/\/+$/, '');

const UPLOAD_TIMEOUT_MS = Number(import.meta.env.VITE_UPLOAD_TIMEOUT_MS) || 15 * 60 * 1000;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lll_music_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lll_music_token');
      localStorage.removeItem('lll_music_user');
      const suppressAuthRedirect = !!error.config?.suppressAuthRedirect;
      const requiresAuthRedirect = !!error.config?.requiresAuthRedirect;

      // Redirect only for requests that explicitly require auth UX.
      if (!suppressAuthRedirect && requiresAuthRedirect && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Music API ────────────────────────────────────────────────────────────────
export const musicAPI = {
  getSongs: (params) => api.get('/music', { params }),
  getSong: (id) => api.get(`/music/${id}`),
  uploadSong: (formData, onUploadProgress) =>
    api.post('/music/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: UPLOAD_TIMEOUT_MS,
      requiresAuthRedirect: true,
    }),
  toggleLike: (id) => api.post(`/music/${id}/like`, null, { requiresAuthRedirect: true }),
  deleteSong: (id) => api.delete(`/music/${id}`, { requiresAuthRedirect: true }),
  // Used by background playback recovery where login redirects would be disruptive.
  deleteSongSilently: (id) => api.delete(`/music/${id}`, { suppressAuthRedirect: true }),
  getRecentlyPlayed: () => api.get('/music/recent', { requiresAuthRedirect: true }),
  getStreamUrl: (id) => `${API_BASE}/music/${id}/stream`,
};

// ─── Playlist API ─────────────────────────────────────────────────────────────
export const playlistAPI = {
  getPlaylists: () => api.get('/playlists', { requiresAuthRedirect: true }),
  getPlaylist: (id) => api.get(`/playlists/${id}`, { requiresAuthRedirect: true }),
  createPlaylist: (data) => api.post('/playlists', data, { requiresAuthRedirect: true }),
  addSong: (playlistId, songId) => api.post(`/playlists/${playlistId}/songs`, { songId }, { requiresAuthRedirect: true }),
  removeSong: (playlistId, songId) => api.delete(`/playlists/${playlistId}/songs/${songId}`, { requiresAuthRedirect: true }),
  deletePlaylist: (id) => api.delete(`/playlists/${id}`, { requiresAuthRedirect: true }),
};

// ─── User Management API ──────────────────────────────────────────────────────
export const userAPI = {
  getAll: () => api.get('/users', { requiresAuthRedirect: true }),
  delete: (id) => api.delete(`/users/${id}`, { requiresAuthRedirect: true }),
};

export default api;
