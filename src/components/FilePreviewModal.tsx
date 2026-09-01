import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  HardDrive,
  Calendar,
  FileText,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  FileCode,
  Music,
  Film,
  Table,
  Loader2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { DriveFileItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';

interface FilePreviewModalProps {
  file: DriveFileItem | null;
  authToken?: string | null;
  onClose: () => void;
  onDownload: (file: DriveFileItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  authToken,
  onClose,
  onDownload,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'stream' | 'gdrive_embed'>('stream');

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);
    setViewTab('stream');

    if (!file) return;

    const mime = (file.mime_type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isTextOrCode =
      mime.startsWith('text/') ||
      mime.includes('json') ||
      mime.includes('javascript') ||
      mime.includes('typescript') ||
      mime.includes('xml') ||
      mime.includes('csv') ||
      ['txt', 'json', 'csv', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'md', 'py', 'java', 'sql', 'sh', 'env', 'yml', 'yaml', 'log', 'xml'].includes(ext);

    if (isTextOrCode) {
      setIsLoadingText(true);
      const url = `/api/files/preview/${file.id}${authToken ? `?token=${authToken}` : ''}`;
      fetch(url, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
        .then((r) => r.text())
        .then((text) => {
          setTextContent(text);
          setIsLoadingText(false);
        })
        .catch(() => {
          setTextContent('Unable to fetch text content.');
          setIsLoadingText(false);
        });
    }
  }, [file, authToken]);

  if (!file) return null;

  const mime = (file.mime_type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isImage = mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext);
  const isVideo = mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
  const isAudio = mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext);
  const isPdf = mime.includes('pdf') || ext === 'pdf';
  const isCsv = mime.includes('csv') || ext === 'csv';
  const isTextOrCode =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('xml') ||
    isCsv ||
    ['txt', 'json', 'csv', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'md', 'py', 'java', 'sql', 'sh', 'env', 'yml', 'yaml', 'log', 'xml'].includes(ext);

  const previewStreamUrl = `/api/files/preview/${file.id}${authToken ? `?token=${authToken}` : ''}`;
  const gdriveEmbedUrl = file.google_file_id
    ? `https://drive.google.com/file/d/${file.google_file_id}/preview`
    : null;

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Render CSV table rows if CSV file
  const renderCsvTable = () => {
    if (!textContent) return null;
    const lines = textContent.trim().split('\n');
    if (lines.length === 0) return null;
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));

    return (
      <div className="overflow-x-auto w-full max-h-[480px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 sticky top-0">
              {headers.map((h, i) => (
                <th key={i} className="p-2.5 font-bold text-slate-800 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2.5 text-slate-700 font-mono">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="preview-modal-box"
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-none rounded-none'
            : 'max-w-4xl w-full max-h-[92vh]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              {isImage && <ZoomIn className="w-5 h-5" />}
              {isVideo && <Film className="w-5 h-5" />}
              {isAudio && <Music className="w-5 h-5" />}
              {isTextOrCode && <FileCode className="w-5 h-5" />}
              {isPdf && <FileText className="w-5 h-5" />}
              {!isImage && !isVideo && !isAudio && !isTextOrCode && !isPdf && <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {formatBytes(file.size_bytes)} • {file.mime_type || 'Unknown Type'} • Linked Drive: <span className="font-semibold text-slate-700">{file.drive_email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Viewer Mode Switcher if Google Drive embed is available */}
            {gdriveEmbedUrl && (
              <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold mr-1">
                <button
                  onClick={() => setViewTab('stream')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewTab === 'stream'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct Stream
                </button>
                <button
                  onClick={() => setViewTab('gdrive_embed')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewTab === 'gdrive_embed'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Google Viewer
                </button>
              </div>
            )}

            {/* Image zoom controls */}
            {isImage && viewTab === 'stream' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 mr-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-semibold px-1 text-slate-700">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Copy button for code/text */}
            {isTextOrCode && textContent && (
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Copy Content"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-900/5 p-3 sm:p-4 flex items-center justify-center min-h-[340px]">
          {viewTab === 'gdrive_embed' && gdriveEmbedUrl ? (
            <iframe
              src={gdriveEmbedUrl}
              title={file.name}
              className="w-full h-full min-h-[480px] rounded-xl border border-slate-200 bg-white"
              allow="autoplay"
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-slate-950/5 rounded-xl border border-slate-200">
              <img
                src={previewStreamUrl}
                alt={file.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[520px] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          ) : isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden shadow-md">
              <video
                controls
                src={previewStreamUrl}
                className="max-h-[520px] w-full object-contain"
              >
                Your browser does not support video playback.
              </video>
            </div>
          ) : isAudio ? (
            <div className="w-full max-w-lg p-6 bg-white rounded-2xl border border-slate-200 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stream Audio • {formatBytes(file.size_bytes)}
                </p>
              </div>
              <audio controls src={previewStreamUrl} className="w-full">
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${previewStreamUrl}#toolbar=1`}
              title={file.name}
              className="w-full h-full min-h-[520px] rounded-xl border border-slate-200 bg-white shadow-xs"
            />
          ) : isCsv && textContent ? (
            <div className="w-full h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {renderCsvTable()}
            </div>
          ) : isTextOrCode ? (
            <div className="w-full h-full bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto font-mono text-xs shadow-inner min-h-[380px]">
              {isLoadingText ? (
                <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading streamed content...</span>
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="select-none text-slate-600 text-right pr-2 border-r border-slate-800 space-y-1">
                    {(textContent || '').split('\n').map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <pre className="flex-1 overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-slate-200">
                    {textContent}
                  </pre>
                </div>
              )}
            </div>
          ) : gdriveEmbedUrl ? (
            <iframe
              src={gdriveEmbedUrl}
              title={file.name}
              className="w-full h-full min-h-[500px] rounded-xl border border-slate-200 bg-white"
              allow="autoplay"
            />
          ) : (
            <iframe
              src={previewStreamUrl}
              title={file.name}
              className="w-full h-full min-h-[480px] rounded-xl border border-slate-200 bg-white"
            />
          )}
        </div>

        {/* Bottom Metadata & Actions */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{file.drive_email}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatDate(file.modified_time)}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>0-Disk Streaming Verification Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => onDownload(file)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/20 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Stream Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
