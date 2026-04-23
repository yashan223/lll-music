import { useState, useEffect } from 'react';
import { ListMusic, Plus, X, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { playlistAPI } from '../lib/api';
import { usePlayer } from '../contexts/PlayerContext';
import { cn } from '../lib/utils';
import SongCard from '../components/SongCard';

export default function Playlists() {
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    const handleSongDeleted = (event) => {
      const songId = event?.detail?.songId;
      const deletedFromServer = event?.detail?.deletedFromServer;
      if (!songId || !deletedFromServer) return;

      setSelectedPlaylist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          songs: (prev.songs || []).filter((entry) => {
            const entrySongId = entry.song?._id || entry.song?.id;
            return entrySongId !== songId;
          }),
        };
      });

      setPlaylists((prev) =>
        prev.map((playlist) => {
          const songs = Array.isArray(playlist.songs) ? playlist.songs : null;
          if (!songs) return playlist;

          const nextSongs = songs.filter((entry) => {
            const entrySongId = entry.song?._id || entry.song?.id;
            return entrySongId !== songId;
          });

          if (nextSongs.length === songs.length) return playlist;

          return {
            ...playlist,
            songs: nextSongs,
            songCount: Math.max(0, (playlist.songCount ?? nextSongs.length) - 1),
          };
        })
      );
    };

    window.addEventListener('lll:song-deleted', handleSongDeleted);
    return () => {
      window.removeEventListener('lll:song-deleted', handleSongDeleted);
    };
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await playlistAPI.getPlaylists();
      setPlaylists(res.data.playlists || []);
    } catch (err) {
      console.error('Fetch playlists error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylist = async (id) => {
    try {
      const res = await playlistAPI.getPlaylist(id);
      setSelectedPlaylist(res.data.playlist);
    } catch (err) {
      console.error('Fetch playlist error:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await playlistAPI.createPlaylist({ name: newName.trim() });
      setPlaylists((prev) => [res.data.playlist, ...prev]);
      setNewName('');
      setCreating(false);
    } catch (err) {
      console.error('Create playlist error:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await playlistAPI.deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
      if (selectedPlaylist?._id === id) setSelectedPlaylist(null);
    } catch (err) {
      console.error('Delete playlist error:', err);
    }
  };

  const handleRemoveSong = async (songId) => {
    if (!selectedPlaylist) return;
    try {
      await playlistAPI.removeSong(selectedPlaylist._id, songId);
      setSelectedPlaylist((prev) => ({
        ...prev,
        songs: prev.songs.filter((s) => s.song?._id !== songId && s.song?.id !== songId),
      }));
    } catch (err) {
      console.error('Remove song error:', err);
    }
  };

  const playAll = () => {
    if (!selectedPlaylist?.songs?.length) return;
    const songs = selectedPlaylist.songs
      .map((s) => s.song)
      .filter(Boolean)
      .map((s) => ({
        id: s._id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        coverUrl: s.coverPath ? `/uploads/${s.coverPath}` : null,
        streamUrl: `/api/music/${s._id}/stream`,
        duration: s.duration,
      }));
    if (songs.length > 0) playSong(songs[0], songs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 size={22} className="animate-spin text-blue-400" />
        <span className="text-[hsl(var(--muted-foreground))]">Loading playlists...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Playlist list panel */}
      <div className={cn(
        'flex flex-col border-r border-[hsl(var(--border))] transition-all',
        selectedPlaylist ? 'w-72 hidden md:flex' : 'flex-1 md:w-72 md:flex-none'
      )}>
        <div className="p-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Playlists</h1>
            <button
              onClick={() => setCreating(!creating)}
              className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Plus size={16} className="text-white" />
            </button>
          </div>

          {/* Create form */}
          {creating && (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 px-3 py-2 rounded-xl bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={createLoading}
                className="px-3 py-2 rounded-xl gradient-bg text-white text-sm font-medium"
              >
                {createLoading ? <Loader2 size={14} className="animate-spin" /> : '✓'}
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center">
                <ListMusic size={22} className="text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No playlists yet</p>
              <button
                onClick={() => setCreating(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Create your first playlist →
              </button>
            </div>
          ) : (
            playlists.map((pl) => (
              <div
                key={pl._id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all',
                  selectedPlaylist?._id === pl._id
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'hover:bg-[hsl(var(--accent))] border border-transparent'
                )}
                onClick={() => fetchPlaylist(pl._id)}
              >
                <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
                  <ListMusic size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{pl.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{pl.songCount || pl.songs?.length || 0} songs</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(pl._id); }}
                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={14} className="text-[hsl(var(--muted-foreground))]" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Playlist detail panel */}
      {selectedPlaylist && (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-6 flex items-start gap-5 border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="md:hidden p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <X size={18} />
            </button>
            <div className="w-28 h-28 rounded-2xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-2xl shadow-blue-500/30">
              <ListMusic size={40} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-1">Playlist</p>
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-1">{selectedPlaylist.name}</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {selectedPlaylist.songs?.length || 0} songs
              </p>
              {selectedPlaylist.songs?.length > 0 && (
                <button
                  onClick={playAll}
                  className="mt-3 px-5 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                >
                  Play All
                </button>
              )}
            </div>
          </div>

          {/* Songs */}
          <div className="p-4 space-y-1">
            {(!selectedPlaylist.songs || selectedPlaylist.songs.length === 0) ? (
              <div className="py-12 text-center text-[hsl(var(--muted-foreground))] text-sm">
                No songs in this playlist yet. Add songs from the Library.
              </div>
            ) : (
              selectedPlaylist.songs
                .filter((entry) => entry.song)
                .map((entry) => {
                  const s = entry.song;
                  const song = {
                    id: s._id || s.id,
                    title: s.title,
                    artist: s.artist,
                    album: s.album,
                    coverUrl: s.coverPath ? `/uploads/${s.coverPath}` : null,
                    streamUrl: `/api/music/${s._id || s.id}/stream`,
                    duration: s.duration,
                    plays: s.plays,
                    likes: s.likes,
                    likeCount: s.likes?.length || 0,
                  };
                  return (
                    <div key={entry._id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <SongCard song={song} songs={[song]} />
                      </div>
                      <button
                        onClick={() => handleRemoveSong(s._id || s.id)}
                        className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Empty right panel placeholder (desktop) */}
      {!selectedPlaylist && (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center text-[hsl(var(--muted-foreground))]">
            <ListMusic size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a playlist to view its songs</p>
          </div>
        </div>
      )}
    </div>
  );
}
