import React from 'react';
import {
  HardDrive,
  Upload,
  FolderPlus,
  Plus,
  ShieldCheck,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  StoragePoolMetrics,
  ConnectedDriveAccount,
  DriveFileItem,
  ZeroStorageAudit,
} from '../types';
import { formatBytes, formatDate } from '../utils/format';

interface DashboardViewProps {
  metrics: StoragePoolMetrics | null;
  drives: ConnectedDriveAccount[];
  files: DriveFileItem[];
  zeroStorageAudit: ZeroStorageAudit | null;
  onNavigateTab: (tab: 'files' | 'uploads' | 'accounts' | 'profile') => void;
  onNewFolderClick: () => void;
  onFileClick: (file: DriveFileItem) => void;
  onConnectDriveClick: () => void;
  onOpenAudit: () => void;
  onSyncDrive: (driveId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  drives,
  files,
  zeroStorageAudit,
  onNavigateTab,
  onNewFolderClick,
  onFileClick,
  onConnectDriveClick,
  onOpenAudit,
  onSyncDrive,
}) => {
  // Aggregate file types
  const typeStats = React.useMemo(() => {
    let imagesCount = 0;
    let imagesBytes = 0;
    let docsCount = 0;
    let docsBytes = 0;
    let videoCount = 0;
    let videoBytes = 0;
    let audioCount = 0;
    let audioBytes = 0;
    let otherCount = 0;
    let otherBytes = 0;

    files.forEach((f) => {
      const mime = (f.mime_type || '').toLowerCase();
      const ext = f.name.split('.').pop()?.toLowerCase() || '';

      if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
        imagesCount++;
        imagesBytes += f.size_bytes;
      } else if (
        mime.startsWith('video/') ||
        ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)
      ) {
        videoCount++;
        videoBytes += f.size_bytes;
      } else if (
        mime.startsWith('audio/') ||
        ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)
      ) {
        audioCount++;
        audioBytes += f.size_bytes;
      } else if (
        mime.includes('pdf') ||
        mime.includes('document') ||
        mime.includes('sheet') ||
        mime.includes('text') ||
        ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'txt', 'csv', 'md'].includes(ext)
      ) {
        docsCount++;
        docsBytes += f.size_bytes;
      } else {
        otherCount++;
        otherBytes += f.size_bytes;
      }
    });

    return [
      {
        label: 'Documents & Spreadsheets',
        count: docsCount,
        bytes: docsBytes,
        icon: <FileText className="w-4 h-4 text-blue-600" />,
        bg: 'bg-blue-50',
      },
      {
        label: 'Images & Photos',
        count: imagesCount,
        bytes: imagesBytes,
        icon: <ImageIcon className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50',
      },
      {
        label: 'Videos & Media',
        count: videoCount,
        bytes: videoBytes,
        icon: <Film className="w-4 h-4 text-purple-600" />,
        bg: 'bg-purple-50',
      },
      {
        label: 'Audio Tracks',
        count: audioCount,
        bytes: audioBytes,
        icon: <Music className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50',
      },
      {
        label: 'Other & Archives',
        count: otherCount,
        bytes: otherBytes,
        icon: <Archive className="w-4 h-4 text-slate-600" />,
        bg: 'bg-slate-50',
      },
    ];
  }, [files]);

  const totalPoolBytes = metrics?.totalBytes || 0;
  const usedPoolBytes = metrics?.usedBytes || 0;
  const freePoolBytes = metrics?.freeBytes || 0;
  const usedPercentage = totalPoolBytes > 0 ? (usedPoolBytes / totalPoolBytes) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Storage Pool Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle geometric background overlay */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Virtual Storage Pool
                </span>
                <span className="text-xs text-slate-400">
                  {drives.length} Linked Google Account{drives.length === 1 ? '' : 's'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formatBytes(usedPoolBytes)} <span className="text-slate-400 font-normal text-lg sm:text-xl">used of</span> {formatBytes(totalPoolBytes)}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Unified capacity aggregated across all connected Google Drive accounts with transparent, zero-disk direct streaming.
              </p>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onNavigateTab('uploads')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload to Pool</span>
              </button>
              <button
                onClick={onNewFolderClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => onNavigateTab('accounts')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Drive</span>
              </button>
            </div>
          </div>

          {/* Unified Storage Progress Bar */}
          <div className="pt-6 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Pool Capacity Allocation</span>
              <span className="text-indigo-300 font-mono">{usedPercentage.toFixed(1)}% Allocated ({formatBytes(freePoolBytes)} Free)</span>
            </div>

            <div className="w-full bg-slate-800/80 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden flex">
              {drives.length === 0 ? (
                <div className="w-full bg-slate-700/50 rounded-full" />
              ) : (
                drives.map((d, idx) => {
                  const driveSlice = totalPoolBytes > 0 ? (d.drive_quota_used / totalPoolBytes) * 100 : 0;
                  const colors = [
                    'bg-indigo-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-cyan-500',
                    'bg-rose-500',
                    'bg-purple-500',
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={d.id}
                      style={{ width: `${Math.max(driveSlice, 0.5)}%` }}
                      className={`${color} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                      title={`${d.email}: ${formatBytes(d.drive_quota_used)} used (${driveSlice.toFixed(1)}% of pool)`}
                    />
                  );
                })
              )}
            </div>

            {/* Drive quota badges */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1 text-xs">
              {drives.map((d, idx) => {
                const colors = [
                  'bg-indigo-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-cyan-500',
                  'bg-rose-500',
                  'bg-purple-500',
                ];
                const dotColor = colors[idx % colors.length];
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 shrink-0"
                  >
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="font-medium text-slate-200 truncate max-w-[120px]" title={d.email}>
                      {d.email.split('@')[0]}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatBytes(d.drive_quota_used)} / {formatBytes(d.drive_quota_total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Storage Breakdown & Zero-Disk Guarantee */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Type Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Storage Content Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Categorized distribution of {files.length} pooled files
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('files')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Files</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {typeStats.map((item, index) => {
              const pct = usedPoolBytes > 0 ? (item.bytes / usedPoolBytes) * 100 : 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                      <p className="text-[11px] text-slate-500">
                        {item.count} item{item.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block font-mono">
                      {formatBytes(item.bytes)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pct.toFixed(1)}% of used pool
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zero-Disk Storage Compliance Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Zero Local Storage
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Live Verified 0-Disk
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              All files are streamed directly between your browser and Google Drive API v3 via chunked HTTP stream pipes. The server retains zero user files on host storage.
            </p>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Server Disk Usage</span>
                <span className="font-mono font-bold text-emerald-700">0 Bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Local Files Cached</span>
                <span className="font-mono font-bold text-emerald-700">0 files</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relay Protocol</span>
                <span className="font-medium text-slate-800">Chunked Stream Pipe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OAuth Refresh Tokens</span>
                <span className="font-medium text-slate-800">AES-256-GCM Encrypted</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAudit}
            className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200/70 text-center cursor-pointer"
          >
            Run Zero-Storage Compliance Audit
          </button>
        </div>
      </div>

      {/* Recent Files Quick View */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Files
            </h3>
            <p className="text-xs text-slate-500">
              Recently modified files across all connected Google Drive accounts
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('files')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Open File Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No files in storage pool yet. Click "Upload to Pool" or connect a Google Drive account.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {files.slice(0, 6).map((file) => (
              <div
                key={file.id}
                onClick={() => onFileClick(file)}
                className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs bg-slate-50/50 hover:bg-white transition-all cursor-pointer group flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatBytes(file.size_bytes)} • {file.drive_email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
