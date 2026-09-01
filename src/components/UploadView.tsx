import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  HardDrive,
  Folder,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  File,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ConnectedDriveAccount, DriveFolderItem } from '../types';
import { formatBytes } from '../utils/format';

interface UploadQueueItem {
  id: string;
  file: File;
  targetDriveId?: string;
  targetFolderId?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  resultDriveEmail?: string;
}

interface UploadViewProps {
  drives: ConnectedDriveAccount[];
  folders: DriveFolderItem[];
  authToken?: string | null;
  onUploadSuccess: () => void;
  onNavigateTab: (tab: 'files' | 'accounts') => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  drives,
  folders,
  authToken,
  onUploadSuccess,
  onNavigateTab,
}) => {
  const [selectedDriveId, setSelectedDriveId] = useState<string>('auto');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadQueueItem[] = files.map((f) => ({
      id: `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      targetDriveId: selectedDriveId === 'auto' ? undefined : selectedDriveId,
      targetFolderId: selectedFolderId || undefined,
      status: 'pending',
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const startUploads = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const pendingItems = queue.filter((item) => item.status === 'pending');

    for (const item of pendingItems) {
      // Update item to uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        if (item.targetDriveId) {
          formData.append('driveId', item.targetDriveId);
        }
        if (item.targetFolderId) {
          formData.append('folderId', item.targetFolderId);
        }

        // Simulate step progress while streaming
        const interval = setInterval(() => {
          setQueue((prev) =>
            prev.map((q) => {
              if (q.id === item.id && q.status === 'uploading' && q.progress < 90) {
                return { ...q, progress: Math.min(88, q.progress + 18) };
              }
              return q;
            })
          );
        }, 200);

        const res = await fetch('/api/files/stream-upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        clearInterval(interval);

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await res.json();

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'completed',
                  progress: 100,
                  resultDriveEmail: data.file?.drive_email,
                }
              : q
          )
        );
        onUploadSuccess();
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: err.message || 'Stream error' } : q
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">Zero-Disk Direct Streaming Uploads</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Direct Pipe
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Files stream in real-time straight into your Google Drive API storage without retaining intermediate disk copies on the application server.
          </p>
        </div>

        {drives.length === 0 && (
          <button
            onClick={() => onNavigateTab('accounts')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0"
          >
            Connect a Google Drive First
          </button>
        )}
      </div>

      {/* Upload Controls & Destination Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Target Destination Drive
          </label>
          <div className="relative">
            <HardDrive className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="auto">⚡ Auto-Balance (Route to drive with most free space)</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.email} ({formatBytes(d.drive_quota_total - d.drive_quota_used)} free) {d.is_primary ? '• Primary' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Target Folder (Optional)
          </label>
          <div className="relative">
            <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Root / Top Level Catalog</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name} {f.path ? `(${f.path})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`bg-white rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          Drag and drop files here, or click to browse
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Select single or multiple files of any type (PDF, Images, Documents, Videos, Code, Archives). All files stream directly to Google Drive.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors">
          <UploadCloud className="w-4 h-4" />
          <span>Select Files to Stream</span>
        </div>
      </div>

      {/* Upload Queue Section */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Upload Queue ({queue.length} file{queue.length === 1 ? '' : 's'})
              </h3>
              <p className="text-xs text-slate-500">
                {completedCount} finished, {pendingCount} waiting
              </p>
            </div>

            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Completed
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={startUploads}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Streaming Files...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Start Streaming ({pendingCount})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {queue.map((item) => (
              <div
                key={item.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          style={{ width: `${item.progress}%` }}
                          className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                        />
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Streamed to {item.resultDriveEmail || 'Google Drive'}
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {item.error}
                      </span>
                    )}

                    {item.status === 'pending' && (
                      <span className="text-[11px] text-slate-400">
                        Ready to stream
                      </span>
                    )}
                  </div>
                </div>

                {item.status === 'pending' && (
                  <button
                    onClick={() => removeQueueItem(item.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zero Disk Storage Guarantee Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Zero Local Storage Guarantee
            </span>
          </div>
          <h3 className="text-base font-bold">Piped Stream Architecture</h3>
          <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
            Multi-part chunk streams are relayed directly to Google Cloud OAuth endpoints. The server has no temporary directory caching and never saves binary payload files to disk.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('files')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0 cursor-pointer"
        >
          <span>View Files Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
