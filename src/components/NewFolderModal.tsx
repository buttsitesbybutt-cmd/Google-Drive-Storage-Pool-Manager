import React, { useState } from 'react';
import { X, FolderPlus, HardDrive, Folder, Loader2 } from 'lucide-react';
import { ConnectedDriveAccount, DriveFolderItem } from '../types';

interface NewFolderModalProps {
  isOpen: boolean;
  drives: ConnectedDriveAccount[];
  folders: DriveFolderItem[];
  currentParentFolderId?: string | null;
  selectedDriveId?: string;
  authToken?: string | null;
  onClose: () => void;
  onFolderCreated: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  drives,
  folders,
  currentParentFolderId,
  selectedDriveId,
  authToken,
  onClose,
  onFolderCreated,
}) => {
  const [folderName, setFolderName] = useState('');
  const [targetDriveId, setTargetDriveId] = useState(selectedDriveId || (drives[0]?.id || ''));
  const [parentFolderId, setParentFolderId] = useState(currentParentFolderId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
          driveId: targetDriveId || undefined,
          parentFolderId: parentFolderId || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create folder');
      }

      setFolderName('');
      onFolderCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="new-folder-modal-box"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Folder</h3>
              <p className="text-xs text-slate-500">
                Organize files in your pooled Google Drive catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Folder Name
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="new-folder-name-input"
                type="text"
                autoFocus
                placeholder="e.g., Financial Reports, Project Assets"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {drives.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Google Drive
              </label>
              <div className="relative">
                <HardDrive className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  id="new-folder-drive-select"
                  value={targetDriveId}
                  onChange={(e) => setTargetDriveId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                >
                  {drives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.email} ({d.name}) {d.is_primary ? '• Primary' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {folders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Parent Location
              </label>
              <select
                id="new-folder-parent-select"
                value={parentFolderId}
                onChange={(e) => setParentFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Root / Top Level</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name} {f.path ? `(${f.path})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="new-folder-submit-btn"
              type="submit"
              disabled={isLoading || !folderName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create Folder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
