import { Readable } from 'stream';
import { db, ConnectedAccountRecord } from './db';
import { decryptToken, encryptToken } from './crypto';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface GoogleQuotaInfo {
  limit: number;
  usage: number;
  usageInDriveTrash: number;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  trashed?: boolean;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

export class GoogleDriveService {
  // In-memory access token cache: key is account.id -> { token, expiresAt }
  private static tokenCache = new Map<string, { token: string; expiresAt: number }>();

  /**
   * Get Google OAuth client credentials for a specific user (or system fallback)
   */
  static getCredentials(userId?: string) {
    const appUrl = process.env.APP_URL || 'https://gdrives.ai.studio';
    const defaultRedirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/oauth/google/callback`;

    if (userId) {
      const user = db.findUserById(userId);
      if (
        user &&
        user.google_client_id &&
        user.encrypted_google_client_secret &&
        user.client_secret_iv &&
        user.client_secret_auth_tag
      ) {
        try {
          const decryptedSecret = decryptToken(
            user.encrypted_google_client_secret,
            user.client_secret_iv,
            user.client_secret_auth_tag
          );
          if (decryptedSecret) {
            return {
              clientId: user.google_client_id,
              clientSecret: decryptedSecret,
              redirectUri: user.custom_redirect_uri || defaultRedirectUri,
              isUserCustom: true,
              userId: user.id,
            };
          }
        } catch (e) {
          console.warn(`Failed to decrypt custom credentials for user ${userId}:`, e);
        }
      }
    }

    return {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: defaultRedirectUri,
      isUserCustom: false,
      userId: undefined,
    };
  }

  /**
   * Build Google OAuth 2.0 Authorization URL for a specific user
   */
  static getAuthUrl(state?: string, userId?: string): string {
    const { clientId, redirectUri } = this.getCredentials(userId);

    if (!clientId) {
      throw new Error(
        'Google OAuth Client ID is not configured. Please enter your Google Cloud Console credentials in the settings modal.'
      );
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline', // Essential for getting refresh token
      prompt: 'consent',     // Forces consent screen to ensure refresh token is returned
      state: state || '',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange OAuth authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string, customRedirectUri?: string, userId?: string) {
    const { clientId, clientSecret, redirectUri } = this.getCredentials(userId);
    const effectiveRedirectUri = customRedirectUri || redirectUri;

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth Client ID or Client Secret is missing. Please configure credentials.'
      );
    }

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: effectiveRedirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to exchange auth code: ${errText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      expiresIn: (data.expires_in as number) || 3600,
    };
  }

  /**
   * Fetch user profile info from Google
   */
  static async getUserProfile(accessToken: string): Promise<GoogleUserInfo> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch user profile: ${errText}`);
    }

    const info = await res.json();
    return {
      id: info.id,
      email: info.email,
      name: info.name || info.email,
      picture: info.picture || '',
    };
  }

  /**
   * Get valid access token for a connected account (refreshes if needed)
   */
  static async getValidAccessToken(account: ConnectedAccountRecord): Promise<string> {
    const now = Date.now();

    // 1. Check in-memory token cache first (super fast and zero decrypt overhead)
    const cached = this.tokenCache.get(account.id);
    if (cached && cached.expiresAt > now + 60000) {
      return cached.token;
    }

    // 2. Try DB-cached access token if valid for at least 3 minutes
    if (
      account.encrypted_access_token &&
      account.access_token_expires_at &&
      account.access_token_expires_at > now + 180000
    ) {
      try {
        const decryptedAccess = decryptToken(account.encrypted_access_token);
        if (decryptedAccess) {
          this.tokenCache.set(account.id, {
            token: decryptedAccess,
            expiresAt: account.access_token_expires_at,
          });
          return decryptedAccess;
        }
      } catch {
        // Silently refresh token without throwing
      }
    }

    // 3. Decrypt the persistent refresh token
    let refreshToken = '';
    try {
      refreshToken = decryptToken(
        account.encrypted_refresh_token,
        account.token_iv,
        account.token_auth_tag
      );
    } catch (e: any) {
      console.error(`Failed to decrypt refresh token for drive ${account.email}:`, e);
      throw new Error(`Authentication token for ${account.email} could not be decrypted. Please reconnect the drive.`);
    }

    if (!refreshToken) {
      throw new Error(`No valid refresh token found for ${account.email}. Please reconnect the account.`);
    }

    // 4. Refresh token request to Google OAuth endpoint
    const { clientId, clientSecret } = this.getCredentials(account.user_id);
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials (Client ID and Secret) are missing. Please configure credentials in Settings.');
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to refresh Google token for ${account.email}: ${err}`);
    }

    const data = await res.json();
    const newAccessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // 5. Store in memory cache
    this.tokenCache.set(account.id, {
      token: newAccessToken,
      expiresAt,
    });

    // 6. Cache the fresh access token in DB with packed self-contained IV & authTag
    try {
      const encAccess = encryptToken(newAccessToken);
      account.encrypted_access_token = encAccess.packed;
      account.access_token_expires_at = expiresAt;
      db.saveConnectedAccount(account);
    } catch (saveErr) {
      console.warn('Failed to persist cached access token to DB:', saveErr);
    }

    return newAccessToken;
  }

  /**
   * Fetch storage quota metrics from Google Drive API
   */
  static async getStorageQuota(accessToken: string): Promise<GoogleQuotaInfo> {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch storage quota: ${err}`);
    }

    const data = await res.json();
    const quota = data.storageQuota || {};
    return {
      limit: quota.limit ? parseInt(quota.limit, 10) : 16106127360, // default 15GB if unlimited
      usage: quota.usage ? parseInt(quota.usage, 10) : 0,
      usageInDriveTrash: quota.usageInDriveTrash
        ? parseInt(quota.usageInDriveTrash, 10)
        : 0,
    };
  }

  /**
   * List all files and folders from Google Drive with pagination support
   */
  static async listFiles(
    accessToken: string,
    folderId?: string
  ): Promise<GoogleDriveFile[]> {
    let query = "trashed = false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const allFiles: GoogleDriveFile[] = [];
    let pageToken: string | null = null;
    let pagesFetched = 0;
    const maxPages = 20; // Support up to 20,000 files/folders across large drives

    do {
      let url = `https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=nextPageToken,files(id,name,mimeType,size,md5Checksum,webViewLink,webContentLink,thumbnailLink,trashed,createdTime,modifiedTime,parents)&q=${encodeURIComponent(
        query
      )}&orderBy=folder,modifiedTime desc`;

      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to list Google Drive files: ${err}`);
      }

      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        allFiles.push(...data.files);
      }
      pageToken = data.nextPageToken || null;
      pagesFetched++;
    } while (pageToken && pagesFetched < maxPages);

    return allFiles;
  }

  /**
   * Zero-Local-Storage Direct Streaming Upload to Google Drive
   * Streams chunks directly through memory without touching local hard drive.
   */
  static async streamUploadFile(
    accessToken: string,
    fileStream: Readable,
    fileName: string,
    mimeType: string,
    sizeBytes?: number,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    // 1. Initiate Resumable Upload Session
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };

    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          ...(sizeBytes ? { 'X-Upload-Content-Length': sizeBytes.toString() } : {}),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`Failed to initiate Drive resumable upload: ${err}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      throw new Error('Google Drive did not return a resumable upload location header');
    }

    // 2. Stream directly into the upload URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
        ...(sizeBytes ? { 'Content-Length': sizeBytes.toString() } : {}),
      },
      // @ts-expect-error Node fetch accepts stream as body
      body: fileStream,
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Failed streaming upload to Drive: ${err}`);
    }

    const uploadedFile = (await uploadRes.json()) as GoogleDriveFile;
    return uploadedFile;
  }

  /**
   * Direct streaming download/preview from Google Drive with optional Range header for audio/video seeking
   */
  static async streamDownloadFile(
    accessToken: string,
    fileId: string,
    rangeHeader?: string
  ): Promise<{ status: number; stream: ReadableStream | null; headers: Headers }> {
    const fetchHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: fetchHeaders,
      }
    );

    if (!res.ok && res.status !== 206) {
      const err = await res.text();
      throw new Error(`Failed to stream download file (${res.status}): ${err}`);
    }

    return {
      status: res.status,
      stream: res.body,
      headers: res.headers,
    };
  }

  /**
   * Delete file permanently from Google Drive
   */
  static async deleteFile(accessToken: string, fileId: string): Promise<boolean> {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new Error(`Failed to delete Google Drive file: ${err}`);
    }

    return true;
  }

  /**
   * Create folder in Google Drive
   */
  static async createFolder(
    accessToken: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Google Drive folder: ${err}`);
    }

    return (await res.json()) as GoogleDriveFile;
  }
}
