import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

// ─── Media Session helper ─────────────────────────────────────────────────────
const supportsMediaSession = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
import { musicAPI } from '../lib/api';

const PlayerContext = createContext(null);
const PLAYER_STATE_KEY = 'lll_player_state';

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const currentSongRef = useRef(null);
  const handlingFailureRef = useRef(false);
  const pendingSeekTimeRef = useRef(null);
  const hasHydratedPlaybackRef = useRef(false);
  const lastPersistedSecondRef = useRef(-1);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    return parseFloat(localStorage.getItem('lll_volume') ?? '0.8');
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off' | 'one' | 'all'
  const [shuffle, setShuffle] = useState(false);

  const audio = audioRef.current;

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const resolveStreamUrl = useCallback((song) => {
    if (!song) return '';
    const raw = song.streamUrl || `/api/music/${song.id}/stream`;

    try {
      const parsed = new URL(raw, window.location.origin);

      // iPhone/remote-device fix: if API returns localhost URL, use the page origin instead.
      if (
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
        parsed.hostname !== window.location.hostname
      ) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }

      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}`;
      }

      return parsed.toString();
    } catch {
      return raw;
    }
  }, []);

  const applyPendingSeek = useCallback(() => {
    const pendingTime = pendingSeekTimeRef.current;
    if (pendingTime == null) return;

    const safeDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const maxTime = safeDuration > 0 ? Math.max(safeDuration - 0.25, 0) : pendingTime;
    const nextTime = Math.min(Math.max(0, pendingTime), maxTime);

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    pendingSeekTimeRef.current = null;
  }, [audio]);

  useEffect(() => {
    if (hasHydratedPlaybackRef.current) return;
    hasHydratedPlaybackRef.current = true;

    try {
      const stored = localStorage.getItem(PLAYER_STATE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const storedSong = parsed?.song;
      if (!storedSong?.id) return;

      const storedTime = Math.max(0, Number(parsed.currentTime) || 0);

      setQueue([storedSong]);
      setQueueIndex(0);
      setCurrentSong(storedSong);
      setCurrentTime(storedTime);

      pendingSeekTimeRef.current = storedTime;
      audio.src = resolveStreamUrl(storedSong);
      audio.load();
    } catch {
      // Ignore invalid stored playback data.
    }
  }, [audio, resolveStreamUrl]);

  useEffect(() => {
    if (!currentSong) {
      lastPersistedSecondRef.current = -1;
      localStorage.removeItem(PLAYER_STATE_KEY);
      return;
    }

    const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
    const second = Math.floor(safeCurrentTime);
    const shouldPersist = !isPlaying || second !== lastPersistedSecondRef.current || second === 0;

    if (!shouldPersist) return;

    lastPersistedSecondRef.current = second;

    try {
      localStorage.setItem(
        PLAYER_STATE_KEY,
        JSON.stringify({
          song: currentSong,
          currentTime: safeCurrentTime,
          wasPlaying: isPlaying,
          savedAt: Date.now(),
        })
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [currentSong, currentTime, isPlaying]);

  const removeSongFromQueue = useCallback((songId) => {
    const previousQueue = queueRef.current;
    const removedIndex = previousQueue.findIndex((song) => song.id === songId);
    const nextQueue = previousQueue.filter((song) => song.id !== songId);

    setQueue(nextQueue);

    if (nextQueue.length === 0) {
      setQueueIndex(0);
      setCurrentSong(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      return null;
    }

    let nextIndex = queueIndexRef.current;
    if (removedIndex !== -1 && removedIndex < nextIndex) {
      nextIndex -= 1;
    }
    if (nextIndex >= nextQueue.length) {
      nextIndex = nextQueue.length - 1;
    }
    if (nextIndex < 0) {
      nextIndex = 0;
    }

    setQueueIndex(nextIndex);
    const fallbackSong = nextQueue[nextIndex];
    setCurrentSong(fallbackSong);
    return fallbackSong;
  }, []);

  const handlePlaybackFailure = useCallback(async (failedSong = null) => {
    const songToDelete = failedSong || currentSongRef.current;
    if (!songToDelete || handlingFailureRef.current) return;

    handlingFailureRef.current = true;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      pendingSeekTimeRef.current = null;

      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);

      let deletedFromServer = false;
      const hasToken = !!localStorage.getItem('lll_music_token');
      const canAttemptDelete = hasToken && songToDelete.canDelete !== false;

      if (canAttemptDelete) {
        try {
          await musicAPI.deleteSongSilently(songToDelete.id);
          deletedFromServer = true;
          console.warn('Auto-deleted unplayable song:', songToDelete.title);
        } catch (err) {
          console.error('Auto-delete failed for unplayable song:', err);
        }
      }

      const nextSong = removeSongFromQueue(songToDelete.id);

      window.dispatchEvent(
        new CustomEvent('lll:song-deleted', {
          detail: {
            songId: songToDelete.id,
            deletedFromServer,
            reason: 'playback-error',
          },
        })
      );

      if (nextSong) {
        pendingSeekTimeRef.current = null;
        audio.src = resolveStreamUrl(nextSong);
        audio.load();
        setCurrentTime(0);
        setDuration(0);
        audio.play().catch((err) => {
          console.error('Playback error:', err);
        });
      }
    } finally {
      handlingFailureRef.current = false;
    }
  }, [audio, removeSongFromQueue, resolveStreamUrl]);

  // ─── Audio Event Listeners ────────────────────────────────────────────────

  const updateMediaMetadata = useCallback(() => {
    if (!supportsMediaSession) return;
    const song = currentSongRef.current;
    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = song.coverUrl
      ? [
          { src: song.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      album: song.album || 'LLL Music',
      artwork,
    });
  }, []);

  useEffect(() => {
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      applyPendingSeek();
    };
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      applyPendingSeek();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      updateMediaMetadata(); // Re-assert metadata on play (fixes iOS)
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      handlePlaybackFailure();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [repeat, queue, queueIndex, shuffle, handlePlaybackFailure, applyPendingSeek, updateMediaMetadata]);

  // ─── Volume sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ─── Controls ─────────────────────────────────────────────────────────────

  const playSong = useCallback(
    (song, songQueue = null) => {
      if (songQueue) {
        setQueue(songQueue);
        const idx = songQueue.findIndex((s) => s.id === song.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      }

      pendingSeekTimeRef.current = null;
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(0);
      audio.src = resolveStreamUrl(song);
      audio.load();
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Playback error:', err));
    },
    [audio, resolveStreamUrl]
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [audio, currentSong, isPlaying]);

  const seek = useCallback(
    (time) => {
      pendingSeekTimeRef.current = null;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [audio]
  );

  const resumePlayback = useCallback(() => {
    if (!currentSong) return;
    applyPendingSeek();
    audio.play().catch(console.error);
  }, [audio, currentSong, applyPendingSeek]);

  const setVolume = useCallback(
    (val) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolumeState(clamped);
      localStorage.setItem('lll_volume', String(clamped));
      setIsMuted(false);
    },
    []
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0;
        else return; // end of queue
      }
    }

    const nextSong = queue[nextIdx];
    pendingSeekTimeRef.current = null;
    setQueueIndex(nextIdx);
    setCurrentSong(nextSong);
    setCurrentTime(0);
    setDuration(0);
    audio.src = resolveStreamUrl(nextSong);
    audio.load();
    audio.play().catch(console.error);
  }, [audio, queue, queueIndex, shuffle, repeat, resolveStreamUrl]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (audio.currentTime > 3) {
      pendingSeekTimeRef.current = null;
      audio.currentTime = 0;
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) prevIdx = repeat === 'all' ? queue.length - 1 : 0;

    const prevSong = queue[prevIdx];
    pendingSeekTimeRef.current = null;
    setQueueIndex(prevIdx);
    setCurrentSong(prevSong);
    setCurrentTime(0);
    setDuration(0);
    audio.src = resolveStreamUrl(prevSong);
    audio.load();
    audio.play().catch(console.error);
  }, [audio, queue, queueIndex, repeat, resolveStreamUrl]);

  const addToQueue = useCallback((song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((prev) => !prev), []);
  const canResume = !!currentSong && !isPlaying && currentTime > 1;

  // ─── Media Session API ───────────────────────────────────────────────────
  // Set metadata whenever the current song changes
  useEffect(() => {
    if (currentSong) {
      audio.title = currentSong.title || 'Unknown Title';
      document.title = `${currentSong.title} - ${currentSong.artist || 'Unknown'} | LLL Music`;
      updateMediaMetadata();
    } else {
      document.title = 'LLL Music — Stream Your World';
      if (supportsMediaSession) navigator.mediaSession.metadata = null;
    }
  }, [currentSong, audio, updateMediaMetadata]);

  // Keep playback state in sync
  useEffect(() => {
    if (!supportsMediaSession) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Update position state so the seek bar in the notification is accurate
  useEffect(() => {
    if (!supportsMediaSession || !duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // setPositionState is not supported on all browsers
    }
  }, [currentTime, duration, audio]);

  // Register action handlers once
  useEffect(() => {
    if (!supportsMediaSession) return;

    const handlers = [
      ['play',          () => { audio.play().catch(console.error); }],
      ['pause',         () => { audio.pause(); }],
      ['previoustrack', () => playPrev()],
      ['nexttrack',     () => playNext()],
      ['seekto',        (details) => {
        if (details.seekTime != null) seek(details.seekTime);
      }],
      ['seekbackward',  (details) => {
        const offset = details.seekOffset ?? 10;
        seek(Math.max(0, audio.currentTime - offset));
      }],
      ['seekforward',   (details) => {
        const offset = details.seekOffset ?? 10;
        seek(Math.min(audio.duration || 0, audio.currentTime + offset));
      }],
    ];

    handlers.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    });

    return () => {
      handlers.forEach(([action]) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* noop */ }
      });
    };
  }, [audio, seek, playPrev, playNext]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        duration,
        currentTime,
        volume,
        isMuted,
        isLoading,
        repeat,
        shuffle,
        playSong,
        canResume,
        resumePlayback,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        playNext,
        playPrev,
        addToQueue,
        cycleRepeat,
        toggleShuffle,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
