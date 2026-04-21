import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Music2, Loader2, SlidersHorizontal } from 'lucide-react';
import { musicAPI, playlistAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import SongCard from '../components/SongCard';
import { debounce } from '../lib/utils';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most Played' },
  { value: 'title', label: 'A–Z' },
];

export default function Library() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const abortRef = useRef(null);

  // Fetch playlists for context menu
  useEffect(() => {
    if (!user) return;
    playlistAPI
      .getPlaylists()
      .then((res) => setPlaylists(res.data.playlists || []))
      .catch(() => {});
  }, [user]);

  const fetchSongs = useCallback(
    async (q, s, p) => {
      // Cancel previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const res = await musicAPI.getSongs({ search: q, sort: s, page: p, limit: 20 });
        setSongs(res.data.songs);
        setPagination(res.data.pagination);
      } catch (err) {
        if (err.name !== 'CanceledError') console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  const debouncedFetch = useCallback(debounce(fetchSongs, 400), [fetchSongs]);

  useEffect(() => {
    setPage(1);
    debouncedFetch(search, sort, 1);
  }, [search, sort]);

  useEffect(() => {
    fetchSongs(search, sort, page);
  }, [page]);

  useEffect(() => {
    const handleSongDeleted = (event) => {
      const songId = event?.detail?.songId;
      const deletedFromServer = event?.detail?.deletedFromServer;
      if (!songId || !deletedFromServer) return;

      setSongs((prev) => prev.filter((song) => song.id !== songId));
      setPagination((prev) =>
        prev
          ? {
              ...prev,
              total: Math.max(0, (prev.total || 0) - 1),
            }
          : prev
      );
    };

    window.addEventListener('lll:song-deleted', handleSongDeleted);
    return () => {
      window.removeEventListener('lll:song-deleted', handleSongDeleted);
    };
  }, []);

  const handleDelete = async (id) => {
    const previousSongs = songs;
    setSongs((prev) => prev.filter((s) => s.id !== id));

    try {
      await musicAPI.deleteSong(id);
      window.dispatchEvent(
        new CustomEvent('lll:song-deleted', {
          detail: {
            songId: id,
            deletedFromServer: true,
            reason: 'manual-delete',
          },
        })
      );
    } catch (err) {
      console.error('Delete error:', err);
      setSongs(previousSongs);
    }
  };

  return (
    <div className="h-full w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-5 md:mb-8 flex-shrink-0">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-1">Music Library</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">
          {pagination?.total != null ? `${pagination.total} songs` : 'Discover and stream music'}
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 mb-4 md:mb-6 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by title, artist, or album..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2.5 rounded-xl bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-purple-500/50 transition-all"
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>

      {/* Sort pills */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-4 md:mb-5 flex-wrap flex-shrink-0">
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Sort by:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                sort === opt.value
                  ? 'gradient-bg text-white shadow-lg shadow-purple-500/25'
                  : 'bg-[hsl(var(--input))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {/* Content */}
        {loading && songs.length === 0 ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={22} className="animate-spin text-purple-400" />
            <span className="text-[hsl(var(--muted-foreground))]">Loading songs...</span>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center">
              <Music2 size={28} className="text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="text-center">
              <p className="text-[hsl(var(--foreground))] font-medium">No songs found</p>
              <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
                {search ? `No results for "${search}"` : 'Upload your first song to get started!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                songs={songs}
                playlists={playlists}
                onDelete={song.canDelete ? handleDelete : undefined}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pb-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage || loading}
              className="px-4 py-2 rounded-xl text-sm border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                      page === p
                        ? 'gradient-bg text-white shadow-lg'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="px-4 py-2 rounded-xl text-sm border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
