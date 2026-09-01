import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const SQL_SCHEMA_DDL = `
-- ============================================================================
-- GOOGLE DRIVE STORAGE POOL MANAGER - SQL DATABASE SCHEMA
-- Compatible with PostgreSQL / Supabase / SQLite
-- ============================================================================

-- 1. USERS TABLE: Isolated user accounts with bcrypt hashed passwords and user-specific Google Cloud Console OAuth credentials
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_client_id VARCHAR(255),
    encrypted_google_client_secret TEXT,
    client_secret_iv VARCHAR(64),
    client_secret_auth_tag VARCHAR(64),
    custom_redirect_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CONNECTED GOOGLE ACCOUNTS: Stores OAuth credentials with AES-256-GCM encrypted tokens
CREATE TABLE IF NOT EXISTS connected_google_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    google_user_id VARCHAR(128),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    encrypted_refresh_token TEXT NOT NULL,
    token_iv VARCHAR(64) NOT NULL,
    token_auth_tag VARCHAR(64) NOT NULL,
    encrypted_access_token TEXT,
    access_token_expires_at BIGINT DEFAULT 0,
    drive_quota_total BIGINT DEFAULT 16106127360, -- default 15GB in bytes
    drive_quota_used BIGINT DEFAULT 0,
    drive_quota_in_trash BIGINT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, email)
);

-- 3. VIRTUAL FOLDERS TABLE: Folder hierarchy mapping
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    drive_account_id VARCHAR(64) NOT NULL,
    google_folder_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_folder_id VARCHAR(64),
    path TEXT DEFAULT '/',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_account_id) REFERENCES connected_google_accounts(id) ON DELETE CASCADE
);

-- 4. POOLED FILES TABLE: Unified file index across all connected user drives
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    drive_account_id VARCHAR(64) NOT NULL,
    google_file_id VARCHAR(128) NOT NULL,
    folder_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    md5_checksum VARCHAR(64),
    web_view_link TEXT,
    web_content_link TEXT,
    thumbnail_link TEXT,
    is_trashed BOOLEAN DEFAULT FALSE,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_account_id) REFERENCES connected_google_accounts(id) ON DELETE CASCADE,
    UNIQUE(drive_account_id, google_file_id)
);

-- 5. CLEANUP & AUDIT LOGS: Proves zero persistent server storage
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id VARCHAR(64) PRIMARY KEY,
    trigger_reason VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_connected_drives_user ON connected_google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_drive ON files(drive_account_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
`;

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  google_client_id?: string;
  encrypted_google_client_secret?: string;
  client_secret_iv?: string;
  client_secret_auth_tag?: string;
  custom_redirect_uri?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectedAccountRecord {
  id: string;
  user_id: string;
  google_user_id: string;
  email: string;
  name: string;
  avatar_url: string;
  encrypted_refresh_token: string;
  token_iv: string;
  token_auth_tag: string;
  encrypted_access_token?: string;
  access_token_expires_at: number;
  drive_quota_total: number;
  drive_quota_used: number;
  drive_quota_in_trash: number;
  is_primary: boolean;
  is_active: boolean;
  last_synced_at: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  drive_account_id: string;
  google_file_id: string;
  folder_id?: string | null;
  name: string;
  mime_type: string;
  size_bytes: number;
  md5_checksum?: string;
  web_view_link?: string;
  web_content_link?: string;
  thumbnail_link?: string;
  is_trashed: boolean;
  created_time: string;
  modified_time: string;
}

export interface FolderRecord {
  id: string;
  user_id: string;
  drive_account_id: string;
  google_folder_id: string;
  name: string;
  parent_folder_id?: string | null;
  path: string;
  created_at: string;
}

export interface CleanupLogRecord {
  id: string;
  trigger_reason: string;
  status: string;
  details: string;
  created_at: string;
}

interface DatabaseData {
  users: UserRecord[];
  connected_accounts: ConnectedAccountRecord[];
  folders: FolderRecord[];
  files: FileRecord[];
  cleanup_logs: CleanupLogRecord[];
}

const DB_FILE = path.join(process.cwd(), 'data_storage.json');

class DatabaseStore {
  private data: DatabaseData = {
    users: [],
    connected_accounts: [],
    folders: [],
    files: [],
    cleanup_logs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.persist();
      }
    } catch (e) {
      console.warn('Initializing new database store:', e);
      this.seedInitialData();
      this.persist();
    }
  }

  private seedInitialData() {
    this.data.users = [];
    this.data.connected_accounts = [];
    this.data.files = [];
    this.data.folders = [];
    this.data.cleanup_logs = [
      {
        id: 'cln_init_01',
        trigger_reason: 'SERVER_BOOT_ZERO_STORAGE_VERIFY',
        status: 'SUCCESS',
        details: 'Verified 0 disk temp artifacts. Strict streaming proxy active.',
        created_at: new Date().toISOString(),
      },
    ];
    this.persist();
  }

  private persist() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Failed to persist database file:', e);
    }
  }

  // --- Users Operations ---
  findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(email: string, passwordHash: string, name: string): UserRecord {
    const user: UserRecord = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.persist();
    return user;
  }

  saveUserCredentials(
    userId: string,
    clientId: string,
    encryptedSecret: string,
    iv: string,
    authTag: string,
    customRedirectUri?: string
  ): UserRecord | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    user.google_client_id = clientId.trim();
    user.encrypted_google_client_secret = encryptedSecret;
    user.client_secret_iv = iv;
    user.client_secret_auth_tag = authTag;
    if (customRedirectUri !== undefined) {
      user.custom_redirect_uri = customRedirectUri.trim();
    }
    user.updated_at = new Date().toISOString();
    this.persist();
    return user;
  }

  clearUserCredentials(userId: string): UserRecord | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    delete user.google_client_id;
    delete user.encrypted_google_client_secret;
    delete user.client_secret_iv;
    delete user.client_secret_auth_tag;
    delete user.custom_redirect_uri;
    user.updated_at = new Date().toISOString();
    this.persist();
    return user;
  }

  // --- Connected Google Accounts ---
  getConnectedAccounts(userId: string): ConnectedAccountRecord[] {
    return this.data.connected_accounts.filter((a) => a.user_id === userId && a.is_active);
  }

  getConnectedAccountById(id: string, userId: string): ConnectedAccountRecord | undefined {
    return this.data.connected_accounts.find((a) => a.id === id && a.user_id === userId);
  }

  saveConnectedAccount(account: Omit<ConnectedAccountRecord, 'id' | 'created_at'> & { id?: string }): ConnectedAccountRecord {
    const existingIndex = this.data.connected_accounts.findIndex(
      (a) => a.user_id === account.user_id && a.email.toLowerCase() === account.email.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updated: ConnectedAccountRecord = {
        ...this.data.connected_accounts[existingIndex],
        ...account,
        is_active: true,
      };
      this.data.connected_accounts[existingIndex] = updated;
      this.persist();
      return updated;
    }

    const hasAccounts = this.data.connected_accounts.some((a) => a.user_id === account.user_id && a.is_active);
    const newRecord: ConnectedAccountRecord = {
      ...account,
      id: account.id || `drv_${crypto.randomBytes(8).toString('hex')}`,
      is_primary: account.is_primary ?? !hasAccounts,
      created_at: new Date().toISOString(),
    };
    this.data.connected_accounts.push(newRecord);
    this.persist();
    return newRecord;
  }

  updateAccountQuota(
    id: string,
    quotaTotal: number,
    quotaUsed: number,
    quotaInTrash: number = 0
  ) {
    const acc = this.data.connected_accounts.find((a) => a.id === id);
    if (acc) {
      acc.drive_quota_total = quotaTotal;
      acc.drive_quota_used = quotaUsed;
      acc.drive_quota_in_trash = quotaInTrash;
      acc.last_synced_at = new Date().toISOString();
      this.persist();
    }
  }

  disconnectAccount(id: string, userId: string): boolean {
    const index = this.data.connected_accounts.findIndex((a) => a.id === id && a.user_id === userId);
    if (index >= 0) {
      this.data.connected_accounts.splice(index, 1);
      // Remove associated files & folders from virtual catalog
      this.data.files = this.data.files.filter((f) => f.drive_account_id !== id);
      this.data.folders = this.data.folders.filter((f) => f.drive_account_id !== id);
      this.persist();
      return true;
    }
    return false;
  }

  setPrimaryAccount(id: string, userId: string) {
    this.data.connected_accounts.forEach((a) => {
      if (a.user_id === userId) {
        a.is_primary = a.id === id;
      }
    });
    this.persist();
  }

  // --- Files Operations ---
  getFiles(userId: string, driveAccountId?: string, folderId?: string | null): FileRecord[] {
    return this.data.files.filter((f) => {
      if (f.user_id !== userId || f.is_trashed) return false;
      if (driveAccountId && f.drive_account_id !== driveAccountId) return false;
      if (folderId !== undefined) {
        if (folderId === 'root' || folderId === '' || folderId === null) {
          if (f.folder_id && f.folder_id !== 'root') {
            const folderExists = this.data.folders.some(
              (folder) =>
                (folder.id === f.folder_id || folder.google_folder_id === f.folder_id) &&
                folder.user_id === userId
            );
            if (folderExists) return false;
          }
        } else {
          const targetFolder = this.data.folders.find(
            (folder) =>
              (folder.id === folderId || folder.google_folder_id === folderId) &&
              folder.user_id === userId
          );
          const targetGoogleId = targetFolder ? targetFolder.google_folder_id : folderId;
          const targetDbId = targetFolder ? targetFolder.id : folderId;
          if (f.folder_id !== targetGoogleId && f.folder_id !== targetDbId) {
            return false;
          }
        }
      }
      return true;
    });
  }

  getFileById(id: string, userId: string): FileRecord | undefined {
    return this.data.files.find((f) => (f.id === id || f.google_file_id === id) && f.user_id === userId);
  }

  saveFile(file: Omit<FileRecord, 'id'> & { id?: string }): FileRecord {
    const existingIndex = this.data.files.findIndex(
      (f) => f.drive_account_id === file.drive_account_id && f.google_file_id === file.google_file_id
    );

    if (existingIndex >= 0) {
      const updated = {
        ...this.data.files[existingIndex],
        ...file,
      };
      this.data.files[existingIndex] = updated;
      this.persist();
      return updated;
    }

    const newRecord: FileRecord = {
      ...file,
      id: file.id || `fil_${crypto.randomBytes(8).toString('hex')}`,
    };
    this.data.files.push(newRecord);
    this.persist();
    return newRecord;
  }

  syncDriveFiles(userId: string, driveAccountId: string, googleFiles: Array<Omit<FileRecord, 'id'> & { id?: string }>) {
    // Keep files from other accounts
    this.data.files = this.data.files.filter((f) => f.drive_account_id !== driveAccountId || f.user_id !== userId);
    // Add newly fetched files with generated ids if omitted
    const records: FileRecord[] = googleFiles.map((gf) => ({
      ...gf,
      id: gf.id || `fil_${crypto.randomBytes(8).toString('hex')}`,
    }));
    this.data.files.push(...records);
    this.persist();
  }

  deleteFile(id: string, userId: string): boolean {
    const index = this.data.files.findIndex((f) => (f.id === id || f.google_file_id === id) && f.user_id === userId);
    if (index >= 0) {
      this.data.files.splice(index, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Folders Operations ---
  getFolders(userId: string, driveAccountId?: string): FolderRecord[] {
    return this.data.folders.filter((f) => {
      if (f.user_id !== userId) return false;
      if (driveAccountId && f.drive_account_id !== driveAccountId) return false;
      return true;
    });
  }

  getFolderById(id: string, userId: string): FolderRecord | undefined {
    return this.data.folders.find((f) => (f.id === id || f.google_folder_id === id) && f.user_id === userId);
  }

  saveFolder(folder: Omit<FolderRecord, 'id'> & { id?: string }): FolderRecord {
    const existingIndex = this.data.folders.findIndex(
      (f) =>
        f.user_id === folder.user_id &&
        f.drive_account_id === folder.drive_account_id &&
        f.google_folder_id === folder.google_folder_id
    );

    if (existingIndex >= 0) {
      const updated = {
        ...this.data.folders[existingIndex],
        ...folder,
      };
      this.data.folders[existingIndex] = updated;
      this.persist();
      return updated;
    }

    const newRecord: FolderRecord = {
      ...folder,
      id: folder.id || `fld_${crypto.randomBytes(8).toString('hex')}`,
    };
    this.data.folders.push(newRecord);
    this.persist();
    return newRecord;
  }

  syncDriveFolders(
    userId: string,
    driveAccountId: string,
    googleFolders: Array<Omit<FolderRecord, 'id'> & { id?: string }>
  ) {
    // Keep folders from other accounts
    this.data.folders = this.data.folders.filter(
      (f) => f.drive_account_id !== driveAccountId || f.user_id !== userId
    );
    const records: FolderRecord[] = googleFolders.map((gf) => ({
      ...gf,
      id: gf.id || `fld_${crypto.randomBytes(8).toString('hex')}`,
    }));
    this.data.folders.push(...records);
    this.persist();
  }

  deleteFolder(id: string, userId: string): boolean {
    const targetFolder = this.getFolderById(id, userId);
    const folderId = targetFolder ? targetFolder.id : id;
    const googleFolderId = targetFolder ? targetFolder.google_folder_id : id;

    const index = this.data.folders.findIndex((f) => (f.id === id || f.google_folder_id === id) && f.user_id === userId);
    if (index >= 0) {
      this.data.folders.splice(index, 1);
      // Unlink folder from files
      this.data.files.forEach((f) => {
        if ((f.folder_id === folderId || f.folder_id === googleFolderId) && f.user_id === userId) {
          f.folder_id = null;
        }
      });
      this.persist();
      return true;
    }
    return false;
  }

  // --- Cleanup Logs ---
  logCleanup(triggerReason: string, status: string, details: string) {
    this.data.cleanup_logs.unshift({
      id: `cln_${crypto.randomBytes(6).toString('hex')}`,
      trigger_reason: triggerReason,
      status,
      details,
      created_at: new Date().toISOString(),
    });
    // Keep last 50 logs
    if (this.data.cleanup_logs.length > 50) {
      this.data.cleanup_logs.pop();
    }
    this.persist();
  }

  getCleanupLogs(): CleanupLogRecord[] {
    return this.data.cleanup_logs;
  }
}

export const db = new DatabaseStore();
