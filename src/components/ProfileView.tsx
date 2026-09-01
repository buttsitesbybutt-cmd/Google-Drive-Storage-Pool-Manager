import React from 'react';
import {
  User,
  Shield,
  KeyRound,
  Database,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Calendar,
  Mail,
  Fingerprint,
  HardDrive,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { User as UserType, ConnectedDriveAccount } from '../types';
import { formatDate } from '../utils/format';

interface ProfileViewProps {
  user: UserType | null;
  drives: ConnectedDriveAccount[];
  hasCustomCredentials?: boolean;
  onOpenCredentials: () => void;
  onOpenOAuthGuide: () => void;
  onOpenAudit: () => void;
  onOpenSchema: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  drives,
  hasCustomCredentials,
  onOpenCredentials,
  onOpenOAuthGuide,
  onOpenAudit,
  onOpenSchema,
  onLogout,
}) => {
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{user.name || 'User Account'}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user.email}</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active Session
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                {drives.length} Linked Google Drive{drives.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Details & Encryption Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Metadata */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Fingerprint className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Account Identity</h3>
          </div>

          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="pt-2 first:pt-0 flex justify-between">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-slate-800 font-semibold">{user.id}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Email Address</span>
              <span className="text-slate-800 font-medium">{user.email}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Registered On</span>
              <span className="text-slate-800 font-medium">{formatDate(user.created_at)}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Tenant Isolation</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Row-Level Enforced
              </span>
            </div>
          </div>
        </div>

        {/* Security & Token Vault */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Security & Token Vault</h3>
          </div>

          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="pt-2 first:pt-0 flex justify-between">
              <span className="text-slate-500">OAuth Refresh Tokens</span>
              <span className="text-slate-800 font-semibold">AES-256-GCM Encrypted</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Private GCP Keys</span>
              <span className="text-slate-800 font-medium">
                {hasCustomCredentials ? 'User Configured' : 'System Default'}
              </span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Authentication</span>
              <span className="text-slate-800 font-medium">Bcrypt + HMAC-SHA256 JWT</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Storage Footprint</span>
              <span className="text-emerald-700 font-bold">0-Disk Server Ingress</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Utilities & Diagnostic Modals */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Tools & Infrastructure Audits
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onOpenCredentials}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Google Cloud Credentials</h4>
                <p className="text-[11px] text-slate-500">Update private Client ID and Secret</p>
              </div>
            </div>
          </button>

          <button
            onClick={onOpenOAuthGuide}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">OAuth Setup Guide</h4>
                <p className="text-[11px] text-slate-500">Step-by-step GCP console instructions</p>
              </div>
            </div>
          </button>

          <button
            onClick={onOpenAudit}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Zero-Storage Audit</h4>
                <p className="text-[11px] text-slate-500">Verify 0 bytes server disk usage</p>
              </div>
            </div>
          </button>

          <button
            onClick={onOpenSchema}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">SQL Schema Inspector</h4>
                <p className="text-[11px] text-slate-500">Inspect database tables & relational DDL</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
