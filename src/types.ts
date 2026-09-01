export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ConnectedDriveAccount {
  id: string;
  user_id: string;
  google_user_id: string;
  email: string;
  name: string;
  avatar_url: string;
  drive_quota_total: number;
  drive_quota_used: number;
  drive_quota_in_trash?: number;
  is_primary: boolean;
  is_active: boolean;
  last_synced_at: string;
  created_at: string;
}

export interface DriveFileItem {
  id: string;
  user_id: string;
  drive_account_id: string;
  drive_email: string;
  drive_name: string;
  google_file_id: string;
  folder_id?: string | null;
  name: string;
  mime_type: string;
  size_bytes: number;
  md5_checksum?: string;
  web_view_link?: string;
  web_content_link?: string;
  thumbnail_link?: string;
  is_trashed?: boolean;
  created_time: string;
  modified_time: string;
}

export interface DriveFolderItem {
  id: string;
  user_id: string;
  drive_account_id: string;
  google_folder_id: string;
  name: string;
  parent_folder_id?: string | null;
  path?: string;
  created_at: string;
}

export interface StoragePoolMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercentage: number;
  connectedDrivesCount: number;
  totalFilesCount: number;
  drives: Array<{
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercentage: number;
    is_primary: boolean;
  }>;
}

export interface ZeroStorageAudit {
  localServerFilesCount: number;
  localServerBytesUsed: number;
  tempDirectoryClean: boolean;
  streamingProxyActive: boolean;
  lastCleanedAt: string;
  storagePolicy: 'STRICT_STREAMING_ZERO_LOCAL_DISK';
}

export interface OAuthConfigStatus {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasEncryptionKey: boolean;
  redirectUri: string;
  appUrl: string;
  isUserCustom?: boolean;
  systemHasCredentials?: boolean;
}

export interface UserCredentialsStatus {
  hasCustomCredentials: boolean;
  clientId: string;
  maskedClientSecret?: string;
  customRedirectUri?: string;
  redirectUri: string;
  appUrl: string;
  systemFallbackAvailable: boolean;
  isConfigured: boolean;
  source: 'USER' | 'SYSTEM' | 'NONE';
  updatedAt?: string;
}
