import { useCallback, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Loader2,
  Music,
  RotateCcw,
} from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { musicAPI } from '../lib/api';
import { cn, formatDuration, stringToColor } from '../lib/utils';
import NowPlayingSheet from './NowPlayingSheet';

export default function Player() {
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
    canResume,
    resumePlayback,
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(null); // preview % while dragging
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const liked = currentSong ? isFavorite(currentSong.id) : false;

  // Shared seek ratio calculator
  const ratioFromEvent = useCallback((clientX) => {
    const rect = seekBarRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleSeek = useCallback(
    (e) => {
      const ratio = ratioFromEvent(e.clientX);
      if (ratio != null) seek(ratio * duration);
    },
    [duration, seek, ratioFromEvent]
  );

  // Touch handlers for the mobile seek bar
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    setIsSeeking(true);
    const ratio = ratioFromEvent(e.touches[0].clientX);
    if (ratio != null) setSeekPreview(ratio * 100);
  }, [ratioFromEvent]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!isSeeking) return;
    const ratio = ratioFromEvent(e.touches[0].clientX);
    if (ratio != null) setSeekPreview(ratio * 100);
  }, [isSeeking, ratioFromEvent]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    const ratio = seekPreview != null ? seekPreview / 100 : ratioFromEvent(e.changedTouches[0]?.clientX);
    if (ratio != null) seek(ratio * duration);
    setIsSeeking(false);
    setSeekPreview(null);
  }, [seekPreview, duration, seek, ratioFromEvent]);

  const handleVolumeChange = useCallback(
    (e) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume]
  );

  const handleLike = async () => {
    if (!currentSong || !user) return;
    try {
      const res = await musicAPI.toggleLike(currentSong.id);
      updateFavorites(currentSong.id, res.data.liked);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <div className="h-20 bg-[hsl(var(--player-bg))] border-t border-[hsl(var(--border))] player-shadow flex items-center justify-center">
        <p className="text-[hsl(var(--muted-foreground))] text-sm flex items-center gap-2">
          <Music size={16} />
          Select a song to start playing
        </p>
      </div>
    );
  }

  const coverBg = stringToColor(currentSong.title);

  return (
    <div className="relative h-16 md:h-20 bg-[hsl(var(--player-bg))] border-t border-[hsl(var(--border))] player-shadow flex items-center px-3 md:px-4 gap-2 md:gap-4 justify-between md:justify-start">
      
      {/* Mobile seek bar with timestamps (hidden on md+) */}
      <div className="absolute top-0 left-0 right-0 md:hidden flex flex-col select-none" style={{ touchAction: 'none' }}>
        {/* Seek track */}
        <div
          ref={seekBarRef}
          onClick={handleSeek}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-[3px] bg-white/10 cursor-pointer group relative"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-[width] duration-100"
            style={{ width: `${isSeeking && seekPreview != null ? seekPreview : progress}%` }}
          />
          {/* Thumb – always visible on mobile */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-[left] duration-100 pointer-events-none"
            style={{ left: `${isSeeking && seekPreview != null ? seekPreview : progress}%` }}
          />
        </div>
        {/* Timestamps */}
        <div className="flex justify-between px-3 pt-0.5 pb-0">
          <span className="text-[9px] tabular-nums text-white/50">{formatDuration(isSeeking && seekPreview != null ? (seekPreview / 100) * duration : currentTime)}</span>
          <span className="text-[9px] tabular-nums text-white/50">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Song Info (Tappable on mobile to open sheet) */}
      <div 
        className="flex items-center gap-2 md:gap-3 w-auto md:w-72 min-w-0 max-w-[50%] md:max-w-none cursor-pointer md:cursor-default"
        onClick={() => {
          if (window.innerWidth < 768) setIsSheetOpen(true);
        }}
      >
        {/* Cover */}
        <div
          className="w-10 h-10 md:w-[52px] md:h-[52px] rounded-md md:rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: currentSong.coverUrl ? undefined : coverBg }}
        >
          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music size={20} className="text-white/70" />
          )}
        </div>

        {/* Title + artist */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
            {currentSong.title}
          </p>
          <p className="text-[10px] md:text-xs text-[hsl(var(--muted-foreground))] truncate">
            {currentSong.artist}
          </p>
        </div>

        {/* Like button (hidden on very small screens) */}
        {user && (
          <button
            onClick={handleLike}
            className={cn(
              'hidden sm:block p-1.5 rounded-full transition-colors flex-shrink-0',
              liked
                ? 'text-red-500 hover:text-red-400'
                : 'text-[hsl(var(--muted-foreground))] hover:text-red-400'
            )}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Center controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 md:gap-1.5 max-w-[full] md:max-w-none ml-auto md:ml-0 overflow-visible">
        {/* Buttons */}
        <div className="flex items-center gap-3 md:gap-4 justify-end md:justify-center w-full">
          {/* Shuffle (desktop only) */}
          <button
            onClick={toggleShuffle}
            className={cn(
              'hidden md:block transition-colors',
              shuffle
                ? 'text-blue-400'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            <Shuffle size={16} />
          </button>

          {/* Previous */}
          <button
            onClick={playPrev}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex-shrink-0"
          >
            <SkipBack className="w-5 h-5 md:w-5 md:h-5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 md:w-9 md:h-9 rounded-full gradient-bg flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} className="text-white" fill="white" />
            ) : (
              <Play size={18} className="text-white translate-x-[1px]" fill="white" />
            )}
          </button>

          {canResume && (
            <button
              onClick={resumePlayback}
              title={`Resume from ${formatDuration(currentTime)}`}
              className="flex items-center gap-1 text-blue-300 hover:text-blue-200 transition-colors flex-shrink-0"
            >
              <RotateCcw size={16} />
              <span className="hidden md:inline text-xs font-medium">Resume</span>
            </button>
          )}

          {/* Next */}
          <button
            onClick={playNext}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex-shrink-0"
          >
            <SkipForward className="w-5 h-5 md:w-5 md:h-5" />
          </button>

          {/* Repeat (desktop only) */}
          <button
            onClick={cycleRepeat}
            className={cn(
              'hidden md:block transition-colors relative',
              repeat !== 'off'
                ? 'text-blue-400'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Seek bar (desktop only) */}
        <div className="hidden md:flex w-full max-w-lg items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-8 text-right tabular-nums">
            {formatDuration(currentTime)}
          </span>

          <div
            onClick={(e) => {
              // Ensure we don't double fire if the ref is attached elsewhere
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seek(ratio * duration);
            }}
            className="flex-1 h-1.5 rounded-full bg-[hsl(var(--border))] cursor-pointer group relative"
          >
            {/* Fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full gradient-bg transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
              style={{ left: `${progress}%` }}
            />
          </div>

          <span className="text-xs text-[hsl(var(--muted-foreground))] w-8 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Volume (desktop only) */}
      <div className="hidden md:flex items-center gap-2 w-36 overflow-hidden">
        <button
          onClick={toggleMute}
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1.5 rounded-full accent-blue-500 cursor-pointer min-w-0"
        />
      </div>

      <NowPlayingSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}
