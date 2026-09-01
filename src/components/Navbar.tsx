import React from 'react';
import {
  HardDrive,
  ShieldCheck,
  Database,
  KeyRound,
  LogOut,
  User as UserIcon,
  CloudLightning,
  LayoutDashboard,
  FolderTree,
  UploadCloud,
} from 'lucide-react';
import { User, StoragePoolMetrics } from '../types';
import { formatBytes } from '../utils/format';
import { NavTab } from './BottomNav';

interface NavbarProps {
  user: User | null;
  poolMetrics: StoragePoolMetrics | null;
  hasCustomCredentials?: boolean;
  activeTab?: NavTab;
  onNavigateTab?: (tab: NavTab) => void;
  onOpenCredentials: () => void;
  onOpenSchema: () => void;
  onOpenOAuthGuide: () => void;
  onOpenZeroStorageAudit: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  poolMetrics,
  hasCustomCredentials,
  activeTab = 'dashboard',
  onNavigateTab,
  onOpenCredentials,
  onOpenSchema,
  onOpenOAuthGuide,
  onOpenZeroStorageAudit,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                DrivePool Hub
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CloudLightning className="w-3 h-3 text-emerald-600" />
                Zero Disk
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Multi-Account Google Drive Storage Pool & File Streamer
            </p>
          </div>
        </div>

        {/* Center: Top Navigation Tabs (Desktop helper) */}
        {onNavigateTab && (
          <div className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onNavigateTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onNavigateTab('files')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>
            <button
              onClick={() => onNavigateTab('uploads')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'uploads'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Uploads</span>
            </button>
            <button
              onClick={() => onNavigateTab('accounts')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Accounts</span>
            </button>
            <button
              onClick={() => onNavigateTab('profile')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </div>
        )}

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User GCP Credentials Modal Trigger */}
          <button
            id="navbar-credentials-btn"
            onClick={onOpenCredentials}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              hasCustomCredentials
                ? 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
            }`}
            title="Configure Personal Google Cloud Console Credentials"
          >
            <KeyRound className={`w-4 h-4 ${hasCustomCredentials ? 'text-indigo-600' : 'text-amber-600'}`} />
            <span>GCP Credentials</span>
            {hasCustomCredentials && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 ml-0.5" />
            )}
          </button>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab && onNavigateTab('profile')}
                className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl border border-slate-200 text-slate-800 text-xs font-medium cursor-pointer transition-colors"
                title="View Profile & Security"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {user.name ? user.name[0] : <UserIcon className="w-3 h-3" />}
                </div>
                <span className="max-w-[110px] truncate hidden md:inline">{user.name}</span>
              </button>

              <button
                id="navbar-logout-btn"
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
