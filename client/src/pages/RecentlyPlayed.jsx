import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { musicAPI } from '../lib/api';
import SongCard from '../components/SongCard';

export default function RecentlyPlayed() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    musicAPI
      .getRecentlyPlayed()
      .then((res) => setSongs(res.data.songs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <Loader2 size={22} className="animate-spin text-purple-400" />
        <span className="text-[hsl(var(--muted-foreground))]">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Clock size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Recently Played</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">{songs.length} tracks</p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center">
            <Clock size={28} className="text-[hsl(var(--muted-foreground))]" />
          </div>
          <div className="text-center">
            <p className="text-[hsl(var(--foreground))] font-medium">No history yet</p>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
              Songs you've played will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song) => (
            <SongCard key={`${song.id}-${song.playedAt}`} song={song} songs={songs} />
          ))}
        </div>
      )}
    </div>
  );
}
