import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  HardDrive,
  Sparkles,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ConnectedDriveAccount } from '../types';
import { formatBytes } from '../utils/format';

interface UploadModalProps {
  isOpen: boolean;
  drives: ConnectedDriveAccount[];
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  drives,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetDriveId, setTargetDriveId] = useState<string>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('driveId', targetDriveId);
      if (targetDriveId === 'auto') {
        formData.append('autoBalance', 'true');
      }

      // Simulate streaming progress feedback
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 300);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        setUploadProgress(0);
        onUploadSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || 'Streaming upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="upload-modal-box"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Direct Stream Upload</h3>
              <p className="text-xs text-slate-500">Zero local disk storage guarantee</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zero storage notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Zero Server Storage: </span>
            This file streams straight through memory into your connected Google Drive without being stored on the server disk.
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Drive Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Destination Drive
            </label>
            <select
              id="upload-target-drive-select"
              value={targetDriveId}
              onChange={(e) => setTargetDriveId(e.target.value)}
              disabled={isUploading}
              className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="auto">
                ⚡ Auto-Balance: Route to Drive with Most Free Space
              </option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.email} ({formatBytes(Math.max(0, d.drive_quota_total - d.drive_quota_used))} free)
                </option>
              ))}
            </select>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileCheck className="w-8 h-8 text-emerald-600" />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 max-w-[240px] truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatBytes(selectedFile.size)} • {selectedFile.type || 'Unknown Type'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  Click to browse or drag and drop file here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports documents, spreadsheets, images, videos, zip archives
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Streaming to Google Drive API...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${uploadProgress}%` }}
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs shadow-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Streaming...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Start Streaming Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
