import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { musicAPI } from '../lib/api';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const currentSongRef = useRef(null);
  const handlingFailureRef = useRef(false);
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
        audio.src = resolveStreamUrl(nextSong);
        audio.load();
        audio.play().catch((err) => {
          console.error('Playback error:', err);
        });
      }
    } finally {
      handlingFailureRef.current = false;
    }
  }, [audio, removeSongFromQueue, resolveStreamUrl]);

  // ─── Audio Event Listeners ────────────────────────────────────────────────

  useEffect(() => {
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      handlePlaybackFailure();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [repeat, queue, queueIndex, shuffle, handlePlaybackFailure]);

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

      setCurrentSong(song);
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
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [audio]
  );

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
    setQueueIndex(nextIdx);
    setCurrentSong(nextSong);
    audio.src = resolveStreamUrl(nextSong);
    audio.load();
    audio.play().catch(console.error);
  }, [audio, queue, queueIndex, shuffle, repeat, resolveStreamUrl]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) prevIdx = repeat === 'all' ? queue.length - 1 : 0;

    const prevSong = queue[prevIdx];
    setQueueIndex(prevIdx);
    setCurrentSong(prevSong);
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
