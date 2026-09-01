import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ConnectedDriveAccount,
  DriveFileItem,
  DriveFolderItem,
  StoragePoolMetrics,
  OAuthConfigStatus,
  UserCredentialsStatus,
  ZeroStorageAudit,
} from './types';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { FileExplorer } from './components/FileExplorer';
import { UploadView } from './components/UploadView';
import { AccountsView } from './components/AccountsView';
import { ProfileView } from './components/ProfileView';
import { UploadModal } from './components/UploadModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { NewFolderModal } from './components/NewFolderModal';
import { OAuthGuideModal } from './components/OAuthGuideModal';
import { SchemaInspectorModal } from './components/SchemaInspectorModal';
import { ZeroStorageAuditModal } from './components/ZeroStorageAuditModal';
import { UserCredentialsModal } from './components/UserCredentialsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthView } from './components/AuthView';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Core Data States
  const [drives, setDrives] = useState<ConnectedDriveAccount[]>([]);
  const [poolMetrics, setPoolMetrics] = useState<StoragePoolMetrics | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [zeroAudit, setZeroAudit] = useState<ZeroStorageAudit | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [syncingDriveId, setSyncingDriveId] = useState<string | null>(null);

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // User GCP Credentials state
  const [userCredentials, setUserCredentials] = useState<UserCredentialsStatus | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState<boolean>(false);

  // File explorer filters
  const [selectedDriveFilter, setSelectedDriveFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<string>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [isOAuthGuideOpen, setIsOAuthGuideOpen] = useState<boolean>(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [isZeroAuditModalOpen, setIsZeroAuditModalOpen] = useState<boolean>(false);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfigStatus | null>(null);

  // Confirmation Modals
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Safe JSON parser helper to prevent '<!doctype' syntax errors
  const parseJsonSafe = async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  };

  // Check current auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await parseJsonSafe(res);
          if (data?.user) {
            setCurrentUser(data.user);
            setAuthToken(token);
          } else {
            localStorage.removeItem('auth_token');
            setAuthToken(null);
            setCurrentUser(null);
          }
        } else {
          localStorage.removeItem('auth_token');
          setAuthToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch OAuth Config status
  useEffect(() => {
    fetch('/api/oauth/google/config')
      .then(async (res) => {
        if (res.ok) {
          const data = await parseJsonSafe(res);
          if (data) setOauthConfig(data);
        }
      })
      .catch((e) => console.error('OAuth config check error:', e));
  }, []);

  // Fetch User Custom GCP Credentials status
  const fetchUserCredentials = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/user/credentials', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await parseJsonSafe(res);
        if (data) setUserCredentials(data);
      }
    } catch (err) {
      console.error('Failed to fetch user credentials status:', err);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken && currentUser) {
      fetchUserCredentials();
    }
  }, [authToken, currentUser, fetchUserCredentials]);

  // Fetch Drives, Metrics, Folders, and Files
  const refreshAllData = useCallback(async () => {
    if (!authToken) return;
    setIsDataLoading(true);

    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // 1. Fetch drives
      const drivesRes = await fetch('/api/drives', { headers });
      if (drivesRes.ok) {
        const dData = await parseJsonSafe(drivesRes);
        if (dData?.drives) setDrives(dData.drives);
      }

      // 2. Fetch metrics
      const metricsRes = await fetch('/api/drives/aggregate', { headers });
      if (metricsRes.ok) {
        const mData = await parseJsonSafe(metricsRes);
        if (mData) setPoolMetrics(mData);
      }

      // 3. Fetch folders
      const foldersRes = await fetch('/api/folders', { headers });
      if (foldersRes.ok) {
        const fldData = await parseJsonSafe(foldersRes);
        if (fldData?.folders) setFolders(fldData.folders);
      }

      // 4. Fetch files with filters
      const params = new URLSearchParams();
      if (selectedDriveFilter) params.append('driveId', selectedDriveFilter);
      if (currentFolderId) params.append('folderId', currentFolderId);
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const filesRes = await fetch(`/api/files?${params.toString()}`, { headers });
      if (filesRes.ok) {
        const fData = await parseJsonSafe(filesRes);
        if (fData?.files) setFiles(fData.files);
      }

      // 5. Fetch audit status
      const auditRes = await fetch('/api/audit/zero-storage', { headers });
      if (auditRes.ok) {
        const aData = await parseJsonSafe(auditRes);
        if (aData?.audit) setZeroAudit(aData.audit);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [authToken, selectedDriveFilter, currentFolderId, selectedCategory, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (authToken && currentUser) {
      refreshAllData();
    }
  }, [authToken, currentUser, refreshAllData]);

  // Listen for OAuth popup completion postMessage
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1')
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        refreshAllData();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [refreshAllData]);

  // User Auth Handlers
  const handleAuthSuccess = (user: User, token: string) => {
    localStorage.setItem('auth_token', token);
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setUserCredentials(null);
    setDrives([]);
    setPoolMetrics(null);
    setFiles([]);
    setFolders([]);
  };

  // Google OAuth Popup Trigger
  const handleConnectGoogleDrive = async () => {
    try {
      const res = await fetch('/api/oauth/google/auth-url', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        // If not configured, open credentials modal directly so user can paste their keys
        if (!userCredentials?.hasCustomCredentials && !oauthConfig?.hasClientId) {
          setIsCredentialsModalOpen(true);
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate auth URL');
      }

      const { url } = await res.json();

      // Check if credentials are not configured
      if (!userCredentials?.hasCustomCredentials && !oauthConfig?.hasClientId) {
        setIsCredentialsModalOpen(true);
        return;
      }

      // Open OAuth provider's authorization URL directly in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        alert('Please allow popups to connect your Google Drive account.');
      }
    } catch (err: any) {
      console.error('Google OAuth trigger error:', err);
      setIsCredentialsModalOpen(true);
    }
  };

  // Re-sync Drive Quota & Files
  const handleSyncDrive = async (driveId: string) => {
    setSyncingDriveId(driveId);
    try {
      const res = await fetch(`/api/drives/${driveId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error('Sync drive error:', e);
    } finally {
      setSyncingDriveId(null);
    }
  };

  // Set Primary Drive
  const handleSetPrimary = async (driveId: string) => {
    try {
      await fetch(`/api/drives/${driveId}/primary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      refreshAllData();
    } catch (e) {
      console.error('Set primary error:', e);
    }
  };

  // Disconnect Drive with Confirmation
  const handleDisconnectDrive = (drive: ConnectedDriveAccount) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Disconnect Google Drive?',
      message: `Are you sure you want to disconnect ${drive.email}? The encrypted refresh token and indexed files will be removed from your pool catalog. (No files on Google Drive will be deleted).`,
      confirmLabel: 'Disconnect Drive',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/drives/${drive.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            refreshAllData();
          }
        } catch (e) {
          console.error('Disconnect error:', e);
        }
      },
    });
  };

  // Direct Streaming Download
  const handleDownloadFile = (file: DriveFileItem) => {
    const downloadUrl = `/api/files/download/${file.id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete File from Drive with Confirmation
  const handleDeleteFile = (file: DriveFileItem) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete File from Google Drive?',
      message: `Are you sure you want to permanently delete "${file.name}" from Google Drive (${file.drive_email})? This action cannot be undone.`,
      confirmLabel: 'Delete File',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/files/${file.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            refreshAllData();
          }
        } catch (e) {
          console.error('Delete file error:', e);
        }
      },
    });
  };

  // Delete Folder with Confirmation
  const handleDeleteFolder = (folder: DriveFolderItem) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Folder?',
      message: `Are you sure you want to delete the folder "${folder.name}"? Files inside will be unassigned to root level.`,
      confirmLabel: 'Delete Folder',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/folders/${folder.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            refreshAllData();
          }
        } catch (e) {
          console.error('Delete folder error:', e);
        }
      },
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading DrivePool Hub...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !authToken) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Navbar
        user={currentUser}
        poolMetrics={poolMetrics}
        hasCustomCredentials={Boolean(userCredentials?.hasCustomCredentials)}
        activeTab={activeTab}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenCredentials={() => setIsCredentialsModalOpen(true)}
        onOpenSchema={() => setIsSchemaModalOpen(true)}
        onOpenOAuthGuide={() => setIsOAuthGuideOpen(true)}
        onOpenZeroStorageAudit={() => setIsZeroAuditModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area (with padding bottom for sticky bottom navigation) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28">
        {/* 1. Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={poolMetrics}
            drives={drives}
            files={files}
            zeroStorageAudit={zeroAudit}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onNewFolderClick={() => setIsNewFolderModalOpen(true)}
            onFileClick={(f) => setPreviewFile(f)}
            onConnectDriveClick={handleConnectGoogleDrive}
            onOpenAudit={() => setIsZeroAuditModalOpen(true)}
            onSyncDrive={handleSyncDrive}
          />
        )}

        {/* 2. Files Catalog View */}
        {activeTab === 'files' && (
          <FileExplorer
            files={files}
            folders={folders}
            drives={drives}
            selectedDriveFilter={selectedDriveFilter}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            viewMode={viewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            currentFolderId={currentFolderId}
            onSelectFolder={setCurrentFolderId}
            onDriveFilterChange={setSelectedDriveFilter}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchQuery}
            onViewModeChange={setViewMode}
            onSortChange={setSortBy}
            onUploadClick={() => setActiveTab('uploads')}
            onNewFolderClick={() => setIsNewFolderModalOpen(true)}
            onDeleteFolder={handleDeleteFolder}
            onPreviewFile={(f) => setPreviewFile(f)}
            onDownloadFile={handleDownloadFile}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {/* 3. Uploads View */}
        {activeTab === 'uploads' && (
          <UploadView
            drives={drives}
            folders={folders}
            authToken={authToken}
            onUploadSuccess={refreshAllData}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 4. Accounts & Google API Hub View */}
        {activeTab === 'accounts' && (
          <AccountsView
            drives={drives}
            syncingDriveId={syncingDriveId}
            credentialsStatus={userCredentials}
            onOpenCredentials={() => setIsCredentialsModalOpen(true)}
            onOpenOAuthGuide={() => setIsOAuthGuideOpen(true)}
            onConnectClick={handleConnectGoogleDrive}
            onSyncDrive={handleSyncDrive}
            onSetPrimary={handleSetPrimary}
            onDisconnectDrive={handleDisconnectDrive}
          />
        )}

        {/* 5. Profile & Security View */}
        {activeTab === 'profile' && (
          <ProfileView
            user={currentUser}
            drives={drives}
            hasCustomCredentials={Boolean(userCredentials?.hasCustomCredentials)}
            onOpenCredentials={() => setIsCredentialsModalOpen(true)}
            onOpenOAuthGuide={() => setIsOAuthGuideOpen(true)}
            onOpenAudit={() => setIsZeroAuditModalOpen(true)}
            onOpenSchema={() => setIsSchemaModalOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Plane Bottom Navigation Bar (5 core parts) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        filesCount={files.length}
        drivesCount={drives.length}
      />

      {/* Create New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        drives={drives}
        folders={folders}
        currentParentFolderId={currentFolderId}
        selectedDriveId={selectedDriveFilter}
        authToken={authToken}
        onClose={() => setIsNewFolderModalOpen(false)}
        onFolderCreated={refreshAllData}
      />

      {/* User-Specific Google Cloud Console Credentials Modal */}
      <UserCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        onSaved={() => {
          fetchUserCredentials();
          refreshAllData();
        }}
        authToken={authToken}
      />

      {/* Upload Modal (Popover shortcut) */}
      <UploadModal
        isOpen={isUploadModalOpen}
        drives={drives}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={refreshAllData}
      />

      {/* In-App Direct File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        authToken={authToken}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* OAuth Setup Guide Modal */}
      <OAuthGuideModal
        isOpen={isOAuthGuideOpen}
        config={oauthConfig}
        onClose={() => setIsOAuthGuideOpen(false)}
        onOpenCredentials={() => setIsCredentialsModalOpen(true)}
      />

      {/* SQL Schema Inspector Modal */}
      <SchemaInspectorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* Zero Disk Storage Audit Modal */}
      <ZeroStorageAuditModal
        isOpen={isZeroAuditModalOpen}
        onClose={() => setIsZeroAuditModalOpen(false)}
      />

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
