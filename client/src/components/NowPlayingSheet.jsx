import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Volume2,
  VolumeX,
  Loader2,
  Music,
  ListMusic,
} from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { musicAPI } from '../lib/api';
import { cn, formatDuration, stringToColor } from '../lib/utils';

export default function NowPlayingSheet({ open, onClose }) {
  const {
    currentSong,
    isPlaying,
    duration,
    currentTime,
    volume,
    isMuted,
    isLoading,
    repeat,
    shuffle,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrev,
    cycleRepeat,
    toggleShuffle,
  } = usePlayer();

  const { isFavorite, updateFavorites, user } = useAuth();

  const seekBarRef = useRef(null);
  const sheetRef = useRef(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(null);

  // Swipe-down-to-dismiss
  const dragStartY = useRef(null);
  const dragCurrentY = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);

  const liked = currentSong ? isFavorite(currentSong.id) : false;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverBg = currentSong ? stringToColor(currentSong.title) : '#3b82f6';

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setDragOffset(0);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ─── Seek helpers ─────────────────────────────────────────────────────────
  const ratioFromX = useCallback((clientX) => {
    const rect = seekBarRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleSeekClick = useCallback((e) => {
    const ratio = ratioFromX(e.clientX);
    if (ratio != null) seek(ratio * duration);
  }, [ratioFromX, seek, duration]);

  const handleSeekTouchStart = useCallback((e) => {
    e.stopPropagation();
    setIsSeeking(true);
    const ratio = ratioFromX(e.touches[0].clientX);
    if (ratio != null) setSeekPreview(ratio * 100);
  }, [ratioFromX]);

  const handleSeekTouchMove = useCallback((e) => {
    e.stopPropagation();
    if (!isSeeking) return;
    const ratio = ratioFromX(e.touches[0].clientX);
    if (ratio != null) setSeekPreview(ratio * 100);
  }, [isSeeking, ratioFromX]);

  const handleSeekTouchEnd = useCallback((e) => {
    e.stopPropagation();
    const ratio = seekPreview != null ? seekPreview / 100 : ratioFromX(e.changedTouches[0]?.clientX);
    if (ratio != null) seek(ratio * duration);
    setIsSeeking(false);
    setSeekPreview(null);
  }, [seekPreview, ratioFromX, seek, duration]);

  // ─── Swipe-down-to-dismiss ────────────────────────────────────────────────
  const handleSheetTouchStart = useCallback((e) => {
    if (isSeeking) return;
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
  }, [isSeeking]);

  const handleSheetTouchMove = useCallback((e) => {
    if (isSeeking || dragStartY.current == null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      dragCurrentY.current = e.touches[0].clientY;
      setDragOffset(delta);
    }
  }, [isSeeking]);

  const handleSheetTouchEnd = useCallback(() => {
    if (dragOffset > 120) {
      onClose();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
  }, [dragOffset, onClose]);

  // ─── Like ─────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!currentSong || !user) return;
    try {
      const res = await musicAPI.toggleLike(currentSong.id);
      updateFavorites(currentSong.id, res.data.liked);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const displayProgress = isSeeking && seekPreview != null ? seekPreview : progress;
  const displayTime = isSeeking && seekPreview != null
    ? (seekPreview / 100) * duration
    : currentTime;

  if (!currentSong) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
        style={{
          transform: open
            ? `translateY(${dragOffset}px)`
            : 'translateY(100%)',
          transition: dragOffset > 0 ? 'none' : 'transform 0.4s cubic-bezier(0.32,0.72,0,1)',
        }}
        className="fixed inset-0 z-[100] md:hidden flex flex-col overflow-hidden bg-[hsl(var(--background))]"
        aria-modal="true"
        role="dialog"
        aria-label="Now Playing"
      >
        {/* Blurred artwork background */}
        <div className="absolute inset-0 overflow-hidden">
          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: 'blur(40px) brightness(0.35) saturate(1.8)' }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at top, ${coverBg}99, #090d17)` }}
            />
          )}
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col h-full w-full px-6 pt-12 pb-10 gap-6 overflow-y-auto">

          {/* Drag handle + close */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-white/30 flex-shrink-0" />
            <div className="w-full flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <ChevronDown size={24} />
              </button>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Now Playing</p>
              <div className="w-10" /> {/* spacer */}
            </div>
          </div>

          {/* Album Art */}
          <div className="flex justify-center flex-shrink-0">
            <div
              className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center ring-1 ring-white/10"
              style={{ background: currentSong.coverUrl ? undefined : coverBg,
                       boxShadow: `0 30px 80px ${coverBg}60` }}
            >
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music size={72} className="text-white/40" />
              )}
            </div>
          </div>

          {/* Song info + like */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white truncate leading-tight">
                {currentSong.title}
              </h2>
              <p className="text-base text-white/60 truncate mt-0.5">
                {currentSong.artist || 'Unknown Artist'}
              </p>
            </div>
            {user && (
              <button
                onClick={handleLike}
                className={cn(
                  'flex-shrink-0 p-2.5 rounded-full transition-all',
                  liked
                    ? 'text-red-400 bg-red-500/20'
                    : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
                )}
                aria-label={liked ? 'Unlike' : 'Like'}
              >
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          {/* Seek bar */}
          <div className="flex flex-col gap-1.5" style={{ touchAction: 'none' }}>
            <div
              ref={seekBarRef}
              onClick={handleSeekClick}
              onTouchStart={handleSeekTouchStart}
              onTouchMove={handleSeekTouchMove}
              onTouchEnd={handleSeekTouchEnd}
              className="relative h-1.5 rounded-full bg-white/15 cursor-pointer group"
            >
              {/* Fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-[width] duration-100"
                style={{ width: `${displayProgress}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-[left] duration-100"
                style={{ left: `${displayProgress}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-xs tabular-nums text-white/50">{formatDuration(displayTime)}</span>
              <span className="text-xs tabular-nums text-white/50">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Main controls */}
          <div className="flex items-center justify-between px-2">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={cn(
                'p-2 rounded-full transition-all',
                shuffle ? 'text-blue-400' : 'text-white/40 hover:text-white'
              )}
              aria-label="Shuffle"
            >
              <Shuffle size={20} />
            </button>

            {/* Prev */}
            <button
              onClick={playPrev}
              className="p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Previous"
            >
              <SkipBack size={28} fill="currentColor" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, hsl(217,90%,50%), hsl(190,90%,45%))' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 size={26} className="text-white animate-spin" />
              ) : isPlaying ? (
                <Pause size={26} className="text-white" fill="white" />
              ) : (
                <Play size={26} className="text-white translate-x-[2px]" fill="white" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              className="p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Next"
            >
              <SkipForward size={28} fill="currentColor" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={cn(
                'p-2 rounded-full transition-all relative',
                repeat !== 'off' ? 'text-blue-400' : 'text-white/40 hover:text-white'
              )}
              aria-label="Repeat"
            >
              {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              {repeat !== 'off' && (
                <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 px-1">
            <button
              onClick={toggleMute}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full accent-blue-400 cursor-pointer"
              aria-label="Volume"
            />
            <Volume2 size={18} className="text-white/50 flex-shrink-0" />
          </div>
        </div>
      </div>
    </>
  );
}
