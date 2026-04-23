import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { musicAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import SongCard from '../components/SongCard';

export default function Favorites() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        // Fetch full song details for each favorite
        const ids = user?.favorites || [];
        if (ids.length === 0) {
          setSongs([]);
          setLoading(false);
          return;
        }

        // Fetch via library – search won't work well so we fetch all and filter
        const res = await musicAPI.getSongs({ limit: 50 });
        const all = res.data.songs || [];
        const favSet = new Set(ids.map((id) => (typeof id === 'string' ? id : id?._id || id?.id)));
        setSongs(all.filter((s) => favSet.has(s.id)));
      } catch (err) {
        console.error('Favorites error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user?.favorites]);

  useEffect(() => {
    const handleSongDeleted = (event) => {
      const songId = event?.detail?.songId;
      const deletedFromServer = event?.detail?.deletedFromServer;
      if (!songId || !deletedFromServer) return;
      setSongs((prev) => prev.filter((song) => song.id !== songId));
    };

    window.addEventListener('lll:song-deleted', handleSongDeleted);
    return () => {
      window.removeEventListener('lll:song-deleted', handleSongDeleted);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 size={22} className="animate-spin text-blue-400" />
        <span className="text-[hsl(var(--muted-foreground))]">Loading favorites...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <Heart size={18} className="text-red-400" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Favorites</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">{songs.length} liked songs</p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center">
            <Heart size={28} className="text-[hsl(var(--muted-foreground))]" />
          </div>
          <div className="text-center">
            <p className="text-[hsl(var(--foreground))] font-medium">No favorites yet</p>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
              Like songs from the library to see them here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} songs={songs} />
          ))}
        </div>
      )}
    </div>
  );
}
