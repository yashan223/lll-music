import { useMemo, useRef, useState } from 'react';
import { Upload as UploadIcon, Music, Image, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { musicAPI } from '../lib/api';
import { cn, formatFileSize } from '../lib/utils';

const MAX_AUDIO_MB = 50;
const MAX_IMAGE_MB = 5;
const MAX_BATCH_FILES = 20;

export default function Upload() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const totalAudioSize = useMemo(
    () => audioFiles.reduce((sum, file) => sum + file.size, 0),
    [audioFiles]
  );

  const isSameFile = (a, b) => (
    a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
  );

  const handleAudioChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const validFiles = [];
    const rejected = [];

    selectedFiles.forEach((file) => {
      const isMp3 = file.name.toLowerCase().endsWith('.mp3') || file.type === 'audio/mpeg';
      if (!isMp3) {
        rejected.push(`${file.name}: only MP3 files are allowed.`);
        return;
      }

      if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
        rejected.push(`${file.name}: must be under ${MAX_AUDIO_MB}MB.`);
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length) {
      const merged = [...audioFiles];
      validFiles.forEach((file) => {
        if (merged.length >= MAX_BATCH_FILES) {
          rejected.push(`You can upload up to ${MAX_BATCH_FILES} files at once.`);
          return;
        }
        if (!merged.some((existing) => isSameFile(existing, file))) {
          merged.push(file);
        }
      });

      setAudioFiles(merged);
      if (status === 'success') setStatus('idle');
    }

    if (rejected.length) {
      setErrorMsg(rejected[0]);
    } else {
      setErrorMsg('');
    }

    // Allow re-selecting the same files in a subsequent pick.
    e.target.value = '';
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

  const removeAudioFile = (indexToRemove) => {
    setAudioFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFiles.length) {
      setErrorMsg('Please select at least one MP3 file.');
      return;
    }

    const fd = new FormData();
    audioFiles.forEach((file) => fd.append('audio', file));
    if (coverFile) fd.append('cover', coverFile);

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const response = await musicAPI.uploadSong(fd, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });

      const count = response?.data?.uploadedCount || audioFiles.length;
      setUploadedCount(count);
      setStatus('success');
      setAudioFiles([]);
      setCoverFile(null);
      setCoverPreview(null);
      setProgress(0);
    } catch (err) {
      setStatus('error');
      if (err.code === 'ECONNABORTED') {
        setErrorMsg('Upload is taking longer than expected. Please wait and try again, or upload fewer files at once.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Upload failed. Please try again.');
      }
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
          <span className="text-sm font-medium">
            {uploadedCount === 1 ? 'Song uploaded successfully!' : `${uploadedCount} songs uploaded successfully!`}
          </span>
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
            Audio Files <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className={cn(
              'w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer min-h-[220px] flex items-center justify-center',
              audioFiles.length
                ? 'border-blue-500/60 bg-blue-500/10'
                : 'border-[hsl(var(--border))] hover:border-blue-500/40 hover:bg-blue-500/5'
            )}
          >
            {audioFiles.length ? (
              <div className="flex flex-col items-center gap-3 w-full max-w-xl">
                <div className="w-16 h-16 rounded-xl gradient-bg flex items-center justify-center">
                  <Music size={28} className="text-white" />
                </div>
                <p className="text-[hsl(var(--foreground))] font-medium mt-1">
                  {audioFiles.length} {audioFiles.length === 1 ? 'file' : 'files'} ready
                </p>
                <p className="text-[hsl(var(--muted-foreground))] text-sm">
                  {formatFileSize(totalAudioSize)} total
                </p>
                <div className="w-full max-h-36 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                  {audioFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center gap-3 px-3 py-2 border-b border-[hsl(var(--border))] last:border-b-0"
                    >
                      <Music size={14} className="text-blue-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm text-[hsl(var(--foreground))] truncate">{file.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAudioFile(index);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioInputRef.current?.click();
                  }}
                  className="text-sm font-medium z-10 px-4 py-2 mt-1 text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Add more files
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center">
                  <UploadIcon size={26} className="text-[hsl(var(--muted-foreground))]" />
                </div>
                <div>
                  <p className="text-[hsl(var(--foreground))] font-medium text-base">
                    Drag & drop your audio files here
                  </p>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">MP3 only, max 50MB each, up to {MAX_BATCH_FILES} files</p>
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
            multiple
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
              className="relative w-20 h-20 rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-blue-500/40 transition-colors overflow-hidden flex items-center justify-center bg-[hsl(var(--accent))] flex-shrink-0"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <Image size={20} className="text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              <p className="font-medium text-[hsl(var(--foreground))]">Attach an image</p>
              <p className="mt-0.5">JPEG, PNG, WebP, or GIF. Max 5MB</p>
              {audioFiles.length > 1 && (
                <p className="mt-1">The selected cover will be applied to all uploaded songs.</p>
              )}
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        {/* Upload progress */}
        {status === 'uploading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Uploading...</span>
              <span className="text-blue-400 font-medium">{progress}%</span>
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
          className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading {audioFiles.length} {audioFiles.length === 1 ? 'song' : 'songs'}... {progress}%
            </>
          ) : (
            <>
              <UploadIcon size={18} />
              Upload {audioFiles.length > 1 ? `${audioFiles.length} Songs` : 'Song'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
