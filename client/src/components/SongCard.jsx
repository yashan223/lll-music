import { useState } from 'react';
import { Play, Heart, MoreHorizontal, ListPlus, Trash2, Music } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { musicAPI, playlistAPI } from '../lib/api';
import ConfirmModal from './ConfirmModal';
import { cn, formatDuration, stringToColor } from '../lib/utils';

export default function SongCard({ song, songs = [], onDelete, onLiked, playlists = [] }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isFavorite, updateFavorites, user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isCurrentSong = currentSong?.id === song.id;
  const isActive = isCurrentSong && isPlaying;
  const liked = isFavorite(song.id);

  const handlePlay = () => {
    playSong(song, songs.length > 0 ? songs : [song]);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await musicAPI.toggleLike(song.id);
      updateFavorites(song.id, res.data.liked);
      onLiked?.(song.id, res.data.liked);
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      await playlistAPI.addSong(playlistId, song.id);
      setShowMenu(false);
    } catch (err) {
      console.error('Add to playlist error:', err);
    }
  };

  const handleDeleteMenuClick = () => {
    if (!onDelete || deleteLoading) return;
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || deleteLoading) return;

    setDeleteLoading(true);
    try {
      await onDelete(song.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete UI error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const coverBg = stringToColor(song.title);

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200',
          isCurrentSong
            ? 'bg-purple-500/15 border border-purple-500/30'
            : 'hover:bg-[hsl(var(--accent))] border border-transparent'
        )}
        onClick={handlePlay}
      >
      {/* Cover image */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: song.coverUrl ? undefined : coverBg }}>
        {song.coverUrl ? (
          <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music size={20} className="text-white/70" />
        )}

        {/* Play overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity rounded-lg',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          {isActive ? (
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full gradient-bg animate-pulse"
                  style={{
                    height: `${[60, 100, 80][i]}%`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <Play size={18} className="text-white translate-x-[1px]" fill="white" />
          )}
        </div>
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold truncate',
            isCurrentSong ? 'text-purple-300' : 'text-[hsl(var(--foreground))]'
          )}
        >
          {song.title}
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{song.artist}</p>
        {song.album && song.album !== 'Unknown Album' && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]/70 truncate">{song.album}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
        <span className="hidden sm:block">{song.plays?.toLocaleString() ?? 0} plays</span>
        <span className="tabular-nums">{formatDuration(song.duration)}</span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        {user && (
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={cn(
              'p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100',
              liked
                ? 'opacity-100 text-red-500 hover:text-red-400'
                : 'text-[hsl(var(--muted-foreground))] hover:text-red-400'
            )}
          >
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* More options */}
        {(playlists.length > 0 || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={15} />
            </button>

            {showMenu && (
              <>
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 bottom-full mb-1 z-20 w-48 glass rounded-xl border border-[hsl(var(--border))] shadow-2xl py-1 overflow-hidden">
                  {/* Add to playlist submenu */}
                  {playlists.length > 0 && (
                    <div className="px-1">
                      <p className="px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
                        Add to playlist
                      </p>
                      {playlists.map((pl) => (
                        <button
                          key={pl._id}
                          onClick={() => handleAddToPlaylist(pl._id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors"
                        >
                          <ListPlus size={14} />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))}
                      <div className="my-1 border-t border-[hsl(var(--border))]" />
                    </div>
                  )}

                  {/* Delete (only uploader) */}
                  {onDelete && (
                    <div className="px-1">
                      <button
                        onClick={handleDeleteMenuClick}
                        disabled={deleteLoading}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        Delete song
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete song?"
        description={`This will permanently remove \"${song.title}\" by ${song.artist}. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleteLoading) setShowDeleteConfirm(false);
        }}
      />
    </>
  );
}
