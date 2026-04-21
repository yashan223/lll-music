import { useState, useRef } from 'react';
import { Upload as UploadIcon, Music, Image, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { musicAPI } from '../lib/api';
import { cn, formatFileSize } from '../lib/utils';

const MAX_AUDIO_MB = 50;
const MAX_IMAGE_MB = 5;

export default function Upload() {
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
      setErrorMsg('Only MP3 files are allowed.');
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setErrorMsg(`Audio file must be under ${MAX_AUDIO_MB}MB.`);
      return;
    }
    setErrorMsg('');
    setAudioFile(file);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrorMsg(`Cover image must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setErrorMsg('');
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) { setErrorMsg('Please select an MP3 file.'); return; }

    const fd = new FormData();
    fd.append('audio', audioFile);
    if (coverFile) fd.append('cover', coverFile);

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      await musicAPI.uploadSong(fd, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });

      setStatus('success');
      setAudioFile(null);
      setCoverFile(null);
      setCoverPreview(null);
      setProgress(0);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  const resetStatus = () => {
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Upload Music</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
          Share your music with the world! File details will be automatically decoded.
        </p>
      </div>

      {/* Success banner */}
      {status === 'success' && (
        <div className="mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">Song uploaded successfully!</span>
          <button type="button" onClick={resetStatus} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {(status === 'error' || errorMsg) && (
        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
          <AlertCircle size={18} />
          <span className="text-sm">{errorMsg}</span>
          <button type="button" onClick={resetStatus} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        {/* Audio drop zone */}
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            Audio File <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className={cn(
              'w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer min-h-[220px] flex items-center justify-center',
              audioFile
                ? 'border-purple-500/60 bg-purple-500/10'
                : 'border-[hsl(var(--border))] hover:border-purple-500/40 hover:bg-purple-500/5'
            )}
          >
            {audioFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl gradient-bg flex items-center justify-center">
                  <Music size={28} className="text-white" />
                </div>
                <p className="text-[hsl(var(--foreground))] font-medium mt-2">{audioFile.name}</p>
                <p className="text-[hsl(var(--muted-foreground))] text-sm">{formatFileSize(audioFile.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                  className="text-sm font-medium z-10 p-2 mt-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove audio
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center">
                  <UploadIcon size={26} className="text-[hsl(var(--muted-foreground))]" />
                </div>
                <div>
                  <p className="text-[hsl(var(--foreground))] font-medium text-base">
                    Drag & drop your audio file here
                  </p>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">MP3 files only, max 50MB</p>
                </div>
                <div className="mt-3 text-sm font-semibold gradient-text px-6 py-2.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-sm transition-transform pointer-events-auto hover:scale-105 active:scale-95">
                  Browse Files
                </div>
              </div>
            )}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleAudioChange}
            className="hidden"
          />
        </div>

        {/* Cover image Optional */}
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
            Custom Cover Image <span className="text-[hsl(var(--muted-foreground))]">(optional)</span>
          </label>
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--input))]">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="relative w-20 h-20 rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-purple-500/40 transition-colors overflow-hidden flex items-center justify-center bg-[hsl(var(--accent))] flex-shrink-0"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <Image size={20} className="text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              <p className="font-medium text-[hsl(var(--foreground))]">Attach an image</p>
              <p className="mt-0.5">JPEG, PNG, or WebP. Max 5MB</p>
              {coverFile && (
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="text-red-400 hover:text-red-300 mt-2 text-xs font-medium uppercase tracking-wider"
                >
                  Remove cover
                </button>
              )}
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        {/* Upload progress */}
        {status === 'uploading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Uploading...</span>
              <span className="text-purple-400 font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--border))] overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'uploading'}
          className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading {progress}%...
            </>
          ) : (
            <>
              <UploadIcon size={18} />
              Upload Song
            </>
          )}
        </button>
      </form>
    </div>
  );
}
