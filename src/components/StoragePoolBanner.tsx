import React from 'react';
import {
  HardDrive,
  CheckCircle2,
  Layers,
  Sparkles,
  PieChart,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { StoragePoolMetrics } from '../types';
import { formatBytes } from '../utils/format';

interface StoragePoolBannerProps {
  metrics: StoragePoolMetrics | null;
  onConnectDriveClick: () => void;
}

const DRIVE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
];

export const StoragePoolBanner: React.FC<StoragePoolBannerProps> = ({
  metrics,
  onConnectDriveClick,
}) => {
  if (!metrics) return null;

  const freePercentage = Math.max(0, 100 - metrics.usedPercentage);

  return (
    <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs mb-6">
      {/* Top section: Title and status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <PieChart className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Unified Storage Pool</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {metrics.connectedDrivesCount} Drive{metrics.connectedDrivesCount === 1 ? '' : 's'} Aggregated
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated capacity pooled from your authenticated Google Drive accounts with zero server disk footprint.
          </p>
        </div>

        <button
          id="banner-connect-drive-btn"
          onClick={onConnectDriveClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Connect Another Drive</span>
        </button>
      </div>

      {/* Visual Storage Progress Bar with per-drive segmentation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center gap-2 text-slate-700">
            <span>Pool Utilization</span>
            <span className="text-indigo-600 font-bold">
              {metrics.usedPercentage}% used
            </span>
          </div>
          <div className="text-slate-500">
            <span className="font-semibold text-slate-800">{formatBytes(metrics.freeBytes)}</span> available of{' '}
            <span className="font-semibold text-slate-800">{formatBytes(metrics.totalBytes)}</span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
          {metrics.drives.map((drive, idx) => {
            const driveContributionPercent =
              metrics.totalBytes > 0
                ? (drive.usedBytes / metrics.totalBytes) * 100
                : 0;

            if (driveContributionPercent <= 0) return null;

            return (
              <div
                key={drive.id}
                style={{ width: `${driveContributionPercent}%` }}
                className={`h-full rounded-xs transition-all ${
                  DRIVE_COLORS[idx % DRIVE_COLORS.length]
                }`}
                title={`${drive.email}: ${formatBytes(drive.usedBytes)} used`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
          {metrics.drives.map((drive, idx) => (
            <div key={drive.id} className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  DRIVE_COLORS[idx % DRIVE_COLORS.length]
                }`}
              />
              <span className="text-slate-600 max-w-[140px] truncate" title={drive.email}>
                {drive.email}
              </span>
              <span className="font-medium text-slate-900">
                ({formatBytes(drive.usedBytes)})
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="text-slate-500">Available Pool Space</span>
            <span className="font-medium text-emerald-600">
              ({formatBytes(metrics.freeBytes)})
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Capacity */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Pool Size</span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            {formatBytes(metrics.totalBytes)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Across {metrics.connectedDrivesCount} Google account{metrics.connectedDrivesCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Used Storage */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Used Space</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            {formatBytes(metrics.usedBytes)}
          </div>
          <div className="text-xs text-indigo-600 font-medium mt-1">
            {metrics.usedPercentage}% of aggregate capacity
          </div>
        </div>

        {/* Free Space */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Free Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700">
            {formatBytes(metrics.freeBytes)}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {freePercentage}% ready for uploads
          </div>
        </div>

        {/* Total Files */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Indexed Files</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            {metrics.totalFilesCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Direct stream proxy active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
