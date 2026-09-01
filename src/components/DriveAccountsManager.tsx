import React, { useState } from 'react';
import {
  HardDrive,
  RefreshCw,
  Trash2,
  Plus,
  ShieldCheck,
  Star,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ConnectedDriveAccount } from '../types';
import { formatBytes, formatDate } from '../utils/format';

interface DriveAccountsManagerProps {
  drives: ConnectedDriveAccount[];
  syncingDriveId: string | null;
  hasCustomCredentials?: boolean;
  onOpenCredentials: () => void;
  onConnectClick: () => void;
  onQuickDemoLink: () => void;
  onSyncDrive: (driveId: string) => void;
  onSetPrimary: (driveId: string) => void;
  onDisconnectDrive: (drive: ConnectedDriveAccount) => void;
}

export const DriveAccountsManager: React.FC<DriveAccountsManagerProps> = ({
  drives,
  syncingDriveId,
  hasCustomCredentials,
  onOpenCredentials,
  onConnectClick,
  onQuickDemoLink,
  onSyncDrive,
  onSetPrimary,
  onDisconnectDrive,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Connected Google Drive Accounts
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {drives.length} Linked
            </span>
            <button
              onClick={onOpenCredentials}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                hasCustomCredentials
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to manage personal Google Cloud Console credentials"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{hasCustomCredentials ? 'Private GCP Keys' : 'Configure GCP Keys'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            OAuth 2.0 refresh tokens are AES-256-GCM encrypted in the database so drives remain permanently connected.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="drive-mgr-creds-btn"
            onClick={onOpenCredentials}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Configure personal Client ID & Secret"
          >
            <span>Credentials</span>
          </button>

          <button
            id="drive-mgr-quick-demo-btn"
            onClick={onQuickDemoLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Link a sandbox test drive to test multi-account pooling"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Add Sandbox Drive</span>
          </button>

          <button
            id="drive-mgr-oauth-connect-btn"
            onClick={onConnectClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect with Google</span>
          </button>
        </div>
      </div>

      {drives.length === 0 ? (
        <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <HardDrive className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No Google Drive Accounts Connected</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Connect your personal or workspace Google Drive accounts to pool their storage and manage files through a single dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onConnectClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Connect with Google OAuth
            </button>
            <button
              onClick={onQuickDemoLink}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Add Sandbox Drive
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drives.map((drive) => {
            const usedPct =
              drive.drive_quota_total > 0
                ? Math.min(100, Math.round((drive.drive_quota_used / drive.drive_quota_total) * 100))
                : 0;

            const isSyncing = syncingDriveId === drive.id;

            return (
              <div
                key={drive.id}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-200 hover:shadow-xs transition-all"
              >
                <div>
                  {/* Account Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      {drive.avatar_url ? (
                        <img
                          src={drive.avatar_url}
                          alt={drive.name}
                          className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                          {drive.email[0]}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                            {drive.name || drive.email}
                          </h4>
                          {drive.is_primary && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                              <Star className="w-2.5 h-2.5 fill-indigo-700" />
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[170px]" title={drive.email}>
                          {drive.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSyncDrive(drive.id)}
                        disabled={isSyncing}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Re-sync quota & files"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                      </button>
                      <button
                        onClick={() => onDisconnectDrive(drive)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Disconnect this Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quota Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>{formatBytes(drive.drive_quota_used)} used</span>
                      <span>{formatBytes(drive.drive_quota_total)} total ({usedPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${usedPct}%` }}
                        className={`h-full rounded-full transition-all ${
                          usedPct > 85
                            ? 'bg-rose-500'
                            : usedPct > 65
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer status */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">AES-256 Persistent</span>
                  </span>
                  {!drive.is_primary && (
                    <button
                      onClick={() => onSetPrimary(drive.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] hover:underline cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
