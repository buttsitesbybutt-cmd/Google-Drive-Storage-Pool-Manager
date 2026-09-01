import React from 'react';
import {
  HardDrive,
  KeyRound,
  ShieldCheck,
  Plus,
  Sparkles,
  RefreshCw,
  Trash2,
  Star,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ConnectedDriveAccount, UserCredentialsStatus } from '../types';
import { formatBytes, formatDate } from '../utils/format';

interface AccountsViewProps {
  drives: ConnectedDriveAccount[];
  syncingDriveId: string | null;
  credentialsStatus: UserCredentialsStatus | null;
  onOpenCredentials: () => void;
  onOpenOAuthGuide: () => void;
  onConnectClick: () => void;
  onSyncDrive: (driveId: string) => void;
  onSetPrimary: (driveId: string) => void;
  onDisconnectDrive: (drive: ConnectedDriveAccount) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  drives,
  syncingDriveId,
  credentialsStatus,
  onOpenCredentials,
  onOpenOAuthGuide,
  onConnectClick,
  onSyncDrive,
  onSetPrimary,
  onDisconnectDrive,
}) => {
  const [copiedRedirect, setCopiedRedirect] = React.useState(false);
  const redirectUri = credentialsStatus?.redirectUri || `${window.location.origin}/api/oauth/callback`;

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">
              Google API & Drive Accounts Hub
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              OAuth 2.0 Vault
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Configure your personal Google Cloud Console credentials, manage persistent OAuth 2.0 refresh tokens, and pool multiple Google Drive accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="accounts-guide-btn"
            onClick={onOpenOAuthGuide}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>OAuth Setup Guide</span>
          </button>
          <button
            id="accounts-creds-btn"
            onClick={onOpenCredentials}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>{credentialsStatus?.hasCustomCredentials ? 'Edit GCP Credentials' : 'Add GCP Credentials'}</span>
          </button>
        </div>
      </div>

      {/* Grid: GCP Credentials Status & Quick Connect */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Cloud Console Credentials Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Google Cloud Console Credentials
                </h3>
                <p className="text-xs text-slate-500">
                  Private per-user OAuth 2.0 Client credentials
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                credentialsStatus?.hasCustomCredentials
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {credentialsStatus?.hasCustomCredentials ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Custom GCP Keys Configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Using Default / Not Configured</span>
                </>
              )}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Google Client ID:</span>
                <span className="font-mono text-slate-800 font-semibold truncate max-w-xs">
                  {credentialsStatus?.clientId ? `${credentialsStatus.clientId.substring(0, 24)}...` : 'Not Set'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Client Secret:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {credentialsStatus?.maskedClientSecret || '••••••••••••••••'} (AES-256-GCM)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Encryption Mode:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  AES-256-GCM Tenant Isolated
                </span>
              </div>
            </div>

            {/* Copy Redirect URI */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Authorized Redirect URI (Required for GCP Console)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={redirectUri}
                  className="flex-1 px-3 py-2 text-xs font-mono text-slate-800 bg-slate-100 border border-slate-200 rounded-xl select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyRedirect}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={onOpenOAuthGuide}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View Google Console Setup Guide</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenCredentials}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
            >
              Configure Credentials
            </button>
          </div>
        </div>

        {/* Quick Connection Actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Connect New Drive
                </h3>
                <p className="text-xs text-slate-500">
                  Add more storage to your unified pool
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Connect personal or corporate Google accounts. OAuth refresh tokens are securely persisted in the database mapped to your user ID so you never have to reconnect on future logins.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              id="accounts-connect-gdrive-btn"
              onClick={onConnectClick}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Connect with Google OAuth</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connected Google Drive Accounts List */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Connected Google Accounts ({drives.length})
            </h3>
            <p className="text-xs text-slate-500">
              Active drives pooled in your virtual storage cluster
            </p>
          </div>
        </div>

        {drives.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <HardDrive className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No Google Drive Accounts Connected</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Add your first Google Drive account above to start pooling storage and managing your files.
            </p>
            <button
              onClick={onConnectClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Connect with Google OAuth
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drives.map((drive) => {
              const usedPct =
                drive.drive_quota_total > 0
                  ? (drive.drive_quota_used / drive.drive_quota_total) * 100
                  : 0;
              const isSyncing = syncingDriveId === drive.id;

              return (
                <div
                  key={drive.id}
                  className={`p-5 rounded-xl border transition-all ${
                    drive.is_primary
                      ? 'border-indigo-300 bg-indigo-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-indigo-700 border border-slate-200 shrink-0">
                        {drive.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={drive.email}>
                            {drive.email}
                          </h4>
                          {drive.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {drive.name || 'Google Drive'} • Synced {formatDate(drive.last_synced_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onSyncDrive(drive.id)}
                        disabled={isSyncing}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Re-sync Quota & Files from Google Drive"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                      </button>
                      {!drive.is_primary && (
                        <button
                          onClick={() => onSetPrimary(drive.id)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Set as Primary Destination Drive"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDisconnectDrive(drive)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Disconnect Drive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quota bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium text-slate-600">
                      <span>Quota Usage</span>
                      <span className="font-mono">
                        {formatBytes(drive.drive_quota_used)} / {formatBytes(drive.drive_quota_total)} ({usedPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, usedPct)}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          usedPct > 90
                            ? 'bg-rose-500'
                            : usedPct > 75
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
