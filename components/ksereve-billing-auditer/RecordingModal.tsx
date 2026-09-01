import React, { useEffect, useMemo, useState } from 'react';
import { X, Music, ExternalLink, AlertTriangle } from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  callStartTime: string;
  recordingUrl: string;
}

/**
 * Extracts the Google Drive file ID from any common Drive URL format:
 *  - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/uc?id=FILE_ID&export=download
 */
const getDriveFileId = (url: string): string | null => {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
};

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  onClose,
  taskId,
  callStartTime,
  recordingUrl,
}) => {
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setAudioError(false); // reset error state on every open
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Google Drive links can't be streamed by the native <audio> tag.
  // Use Drive's embedded preview player so the user can listen in-page
  // without downloading. Non-Drive (direct mp3/wav) URLs use <audio>.
  const driveFileId = useMemo(() => getDriveFileId(recordingUrl), [recordingUrl]);
  const isDriveUrl = !!driveFileId;
  const drivePreviewUrl = isDriveUrl
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform duration-200">
        {/* Top Gradient Header Bar */}
        <div className="bg-gradient-to-r from-teal-600 to-indigo-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">Call Recording Player</h3>
              <p className="text-[10px] text-white/80">{taskId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg text-white/90 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6">
          <div className="mb-4 text-center">
            <span className="inline-block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Call Start Time
            </span>
            <p className="text-sm font-semibold text-slate-800">{callStartTime || '—'}</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner">
            {isDriveUrl ? (
              /* In-page Google Drive audio player (streams, no download needed) */
              <iframe
                src={drivePreviewUrl!}
                className="w-full h-40 rounded-lg border-0 bg-white"
                allow="autoplay"
                title={`Recording ${taskId}`}
              />
            ) : audioError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <p className="text-xs text-slate-600 font-medium">
                  This recording can&apos;t be streamed in the browser.
                </p>
                <a
                  href={recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Recording
                </a>
              </div>
            ) : (
              /* Direct audio URL — native player */
              <audio
                src={recordingUrl}
                controls
                autoPlay
                onError={() => setAudioError(true)}
                className="w-full focus:outline-none"
              >
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a
            href={recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
};
