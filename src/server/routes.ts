import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Busboy from 'busboy';
import { Readable, PassThrough } from 'stream';
import { db, ConnectedAccountRecord } from './db';
import { encryptToken, decryptToken } from './crypto';
import { GoogleDriveService } from './googleDrive';
import { CleanupService } from './cleanup';
import { SQL_SCHEMA_DDL } from './db';
import { StoragePoolMetrics } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gdrive-storage-pool-jwt-secret-key-32chars';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Authentication Middleware
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// ----------------------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// ----------------------------------------------------------------------------

/**
 * User Registration
 */
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = db.createUser(email, passwordHash, name);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * User Login
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

/**
 * Get Current User
 */
router.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
  });
});

/**
 * User Logout
 */
router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  return res.json({ message: 'Logged out successfully' });
});

// ----------------------------------------------------------------------------
// 2. GOOGLE OAUTH 2.0 & MULTI-DRIVE LINKING
// ----------------------------------------------------------------------------

/**
 * Check Google OAuth status & config for system and authenticated user
 */
router.get('/oauth/google/config', (req: Request, res: Response) => {
  let userId: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch {
      // Ignore invalid token on public config check
    }
  }

  const creds = GoogleDriveService.getCredentials(userId);
  const sysCreds = GoogleDriveService.getCredentials();

  return res.json({
    hasClientId: Boolean(creds.clientId),
    hasClientSecret: Boolean(creds.clientSecret),
    hasEncryptionKey: Boolean(process.env.ENCRYPTION_KEY),
    redirectUri: creds.redirectUri,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    isUserCustom: creds.isUserCustom,
    systemHasCredentials: Boolean(sysCreds.clientId && sysCreds.clientSecret),
  });
});

/**
 * User-specific Google Cloud Console Credentials Management
 */
router.get('/user/credentials', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = db.findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasCustom = Boolean(
      user.google_client_id &&
      user.encrypted_google_client_secret &&
      user.client_secret_iv &&
      user.client_secret_auth_tag
    );

    const creds = GoogleDriveService.getCredentials(req.userId);
    const systemCreds = GoogleDriveService.getCredentials();

    let maskedSecret = '';
    if (hasCustom && user.encrypted_google_client_secret) {
      try {
        const decrypted = decryptToken(
          user.encrypted_google_client_secret,
          user.client_secret_iv!,
          user.client_secret_auth_tag!
        );
        if (decrypted.length > 8) {
          maskedSecret = decrypted.substring(0, 7) + '••••••••' + decrypted.substring(decrypted.length - 4);
        } else {
          maskedSecret = '••••••••••••';
        }
      } catch {
        maskedSecret = '••••••••••••';
      }
    }

    return res.json({
      hasCustomCredentials: hasCustom,
      clientId: user.google_client_id || '',
      maskedClientSecret: maskedSecret,
      customRedirectUri: user.custom_redirect_uri || '',
      redirectUri: creds.redirectUri,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      systemFallbackAvailable: Boolean(systemCreds.clientId && systemCreds.clientSecret),
      isConfigured: Boolean(creds.clientId && creds.clientSecret),
      source: hasCustom ? 'USER' : systemCreds.clientId ? 'SYSTEM' : 'NONE',
      updatedAt: user.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve credentials' });
  }
});

/**
 * Save / Update User-specific Google Cloud Console Credentials
 */
router.post('/user/credentials', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientSecret, customRedirectUri } = req.body;

    if (!clientId || !String(clientId).trim()) {
      return res.status(400).json({ error: 'Google OAuth Client ID is required' });
    }

    if (!clientSecret || !String(clientSecret).trim()) {
      return res.status(400).json({ error: 'Google OAuth Client Secret is required' });
    }

    const trimmedClientId = String(clientId).trim();
    const trimmedClientSecret = String(clientSecret).trim();

    // Basic format validation
    if (!trimmedClientId.includes('.apps.googleusercontent.com') && !trimmedClientId.includes('-')) {
      return res.status(400).json({
        error: 'Invalid Client ID format. Google OAuth Client IDs usually end with .apps.googleusercontent.com',
      });
    }

    // Encrypt client secret using AES-256-GCM
    const encSecret = encryptToken(trimmedClientSecret);

    const updatedUser = db.saveUserCredentials(
      req.userId!,
      trimmedClientId,
      encSecret.encrypted,
      encSecret.iv,
      encSecret.authTag,
      customRedirectUri ? String(customRedirectUri).trim() : undefined
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Google Cloud Console credentials saved successfully for your account.',
      hasCustomCredentials: true,
      clientId: updatedUser.google_client_id,
      source: 'USER',
    });
  } catch (err: any) {
    console.error('Failed to save user credentials:', err);
    return res.status(500).json({ error: 'Failed to save credentials: ' + (err.message || 'Server error') });
  }
});

/**
 * Remove User-specific Credentials (reset to system fallback)
 */
router.delete('/user/credentials', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = db.clearUserCredentials(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sysCreds = GoogleDriveService.getCredentials();

    return res.json({
      message: 'Personal Google Cloud credentials cleared. Reverted to default settings.',
      hasCustomCredentials: false,
      systemFallbackAvailable: Boolean(sysCreds.clientId && sysCreds.clientSecret),
      source: sysCreds.clientId ? 'SYSTEM' : 'NONE',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear credentials' });
  }
});

/**
 * Test & Validate Credentials Format
 */
router.post('/user/credentials/test', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { clientId, clientSecret } = req.body;
    const testId = String(clientId || '').trim();
    const testSecret = String(clientSecret || '').trim();

    const issues: string[] = [];

    if (!testId) {
      issues.push('Client ID cannot be empty.');
    } else {
      if (!testId.includes('.apps.googleusercontent.com')) {
        issues.push('Client ID should typically end with ".apps.googleusercontent.com"');
      }
      if (testId.length < 20) {
        issues.push('Client ID looks unusually short.');
      }
    }

    if (!testSecret) {
      issues.push('Client Secret cannot be empty.');
    } else {
      if (testSecret.length < 10) {
        issues.push('Client Secret looks unusually short.');
      }
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_URL || 'http://localhost:3000'}/api/oauth/google/callback`;

    return res.json({
      valid: issues.length === 0,
      issues,
      redirectUri,
      message:
        issues.length === 0
          ? 'Credentials structure looks valid! Make sure you added the Authorized Redirect URI in Google Cloud Console.'
          : 'Please review credential format warnings.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Validation check failed' });
  }
});

/**
 * Get Google OAuth Authorization URL for popup
 */
router.get('/oauth/google/auth-url', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const statePayload = Buffer.from(
      JSON.stringify({ userId: req.userId, timestamp: Date.now() })
    ).toString('base64');

    const authUrl = GoogleDriveService.getAuthUrl(statePayload, req.userId);
    return res.json({ url: authUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to construct OAuth URL' });
  }
});

/**
 * Google OAuth Callback Handler
 * Receives authorization code, exchanges for tokens, encrypts refresh token,
 * stores in connected_google_accounts table, and responds with popup closure script.
 */
router.get(['/oauth/google/callback', '/oauth/google/callback/'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Failed</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2 style="color:#e11d48;">Connection Failed</h2>
          <p>${String(error)}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${String(error)}' }, '*');
              setTimeout(() => window.close(), 2500);
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    let userId: string | null = null;
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
        userId = decodedState.userId;
      } catch (e) {
        console.warn('Could not parse OAuth state:', e);
      }
    }

    // Exchange auth code for tokens using user's specific credentials
    const tokens = await GoogleDriveService.exchangeCodeForTokens(String(code), undefined, userId || undefined);
    const userProfile = await GoogleDriveService.getUserProfile(tokens.accessToken);
    let quota = { limit: 16106127360, usage: 0, usageInDriveTrash: 0 };

    try {
      quota = await GoogleDriveService.getStorageQuota(tokens.accessToken);
    } catch (qErr) {
      console.warn('Could not fetch storage quota on initial link:', qErr);
    }

    if (!tokens.refreshToken) {
      console.warn('Google did not return a refresh token (consent may have been previously granted)');
    }

    // Encrypt the refresh token with AES-256-GCM
    const encToken = encryptToken(tokens.refreshToken || 'existing_authorized_token');
    const encAccess = encryptToken(tokens.accessToken);

    if (userId) {
      // Save connected account with AES-256 encrypted refresh token
      const account = db.saveConnectedAccount({
        user_id: userId,
        google_user_id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        avatar_url: userProfile.picture,
        encrypted_refresh_token: encToken.encrypted,
        token_iv: encToken.iv,
        token_auth_tag: encToken.authTag,
        encrypted_access_token: encAccess.packed,
        access_token_expires_at: Date.now() + tokens.expiresIn * 1000,
        drive_quota_total: quota.limit,
        drive_quota_used: quota.usage,
        drive_quota_in_trash: quota.usageInDriveTrash,
        is_primary: false,
        is_active: true,
        last_synced_at: new Date().toISOString(),
      });

      // Synchronize folders and files list from Google Drive
      try {
        const googleItems = await GoogleDriveService.listFiles(tokens.accessToken);

        // 1. Separate and sync folders
        const folderItems = googleItems.filter((i) => i.mimeType === 'application/vnd.google-apps.folder');
        const mappedFolders = folderItems.map((gf) => ({
          user_id: userId!,
          drive_account_id: account.id,
          google_folder_id: gf.id,
          parent_folder_id: gf.parents?.[0] || null,
          name: gf.name,
          path: `/${gf.name}`,
          color: '#4f46e5',
          created_at: gf.createdTime || new Date().toISOString(),
        }));
        db.syncDriveFolders(userId!, account.id, mappedFolders);

        // 2. Separate and sync files
        const fileItems = googleItems.filter((i) => i.mimeType !== 'application/vnd.google-apps.folder');
        const mappedFiles = fileItems.map((gf) => ({
          user_id: userId!,
          drive_account_id: account.id,
          google_file_id: gf.id,
          folder_id: gf.parents?.[0] || null,
          name: gf.name,
          mime_type: gf.mimeType,
          size_bytes: gf.size ? parseInt(gf.size, 10) : 0,
          md5_checksum: gf.md5Checksum,
          web_view_link: gf.webViewLink,
          web_content_link: gf.webContentLink,
          thumbnail_link: gf.thumbnailLink,
          is_trashed: false,
          created_time: gf.createdTime || new Date().toISOString(),
          modified_time: gf.modifiedTime || new Date().toISOString(),
        }));
        db.syncDriveFiles(userId!, account.id, mappedFiles);
      } catch (fErr) {
        console.warn('Initial folder & file sync warning:', fErr);
      }
    }

    // Return popup postMessage script
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; max-width: 400px; }
            .badge { display: inline-flex; width: 48px; height: 48px; border-radius: 24px; background: #ecfdf5; color: #059669; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓</div>
            <h2 style="margin: 0 0 8px 0; color: #0f172a;">Drive Connected!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">Google Drive (${userProfile.email}) has been securely linked and pooled.</p>
            <p style="color: #94a3b8; font-size: 12px;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', email: '${userProfile.email}' }, '*');
              setTimeout(() => window.close(), 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('OAuth Callback processing error:', err);
    return res.status(500).send(`Authentication error: ${err.message}`);
  }
});

// ----------------------------------------------------------------------------
// 3. STORAGE POOL & DRIVE MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * List all connected Google Drive accounts for the current user
 */
router.get('/drives', requireAuth, (req: AuthRequest, res: Response) => {
  const accounts = db.getConnectedAccounts(req.userId!);
  return res.json({ drives: accounts });
});

/**
 * Get Aggregated Storage Pool Metrics across all connected drives
 */
router.get('/drives/aggregate', requireAuth, (req: AuthRequest, res: Response) => {
  const accounts = db.getConnectedAccounts(req.userId!);
  const files = db.getFiles(req.userId!);

  const totalBytes = accounts.reduce((acc, curr) => acc + (curr.drive_quota_total || 0), 0);
  const usedBytes = accounts.reduce((acc, curr) => acc + (curr.drive_quota_used || 0), 0);
  const freeBytes = Math.max(0, totalBytes - usedBytes);
  const usedPercentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

  const metrics: StoragePoolMetrics = {
    totalBytes,
    usedBytes,
    freeBytes,
    usedPercentage,
    connectedDrivesCount: accounts.length,
    totalFilesCount: files.length,
    drives: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      avatar_url: a.avatar_url,
      totalBytes: a.drive_quota_total,
      usedBytes: a.drive_quota_used,
      freeBytes: Math.max(0, a.drive_quota_total - a.drive_quota_used),
      usedPercentage:
        a.drive_quota_total > 0
          ? Math.round((a.drive_quota_used / a.drive_quota_total) * 100)
          : 0,
      is_primary: a.is_primary,
    })),
  };

  return res.json(metrics);
});

/**
 * Set Primary Drive Account
 */
router.post('/drives/:id/primary', requireAuth, (req: AuthRequest, res: Response) => {
  db.setPrimaryAccount(req.params.id, req.userId!);
  return res.json({ message: 'Primary drive updated' });
});

/**
 * Re-Sync All Connected Drive Accounts (Quotas, Folders, and Files)
 */
router.post('/drives/sync-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const accounts = db.getConnectedAccounts(req.userId!);
    let totalSyncedFiles = 0;
    let totalSyncedFolders = 0;

    for (const account of accounts) {
      try {
        const creds = GoogleDriveService.getCredentials(req.userId);
        if (creds.clientId && creds.clientSecret && !account.encrypted_refresh_token.startsWith('demo_')) {
          const accessToken = await GoogleDriveService.getValidAccessToken(account);
          const quota = await GoogleDriveService.getStorageQuota(accessToken);
          db.updateAccountQuota(account.id, quota.limit, quota.usage, quota.usageInDriveTrash);

          const googleItems = await GoogleDriveService.listFiles(accessToken);

          // 1. Sync Folders
          const folderItems = googleItems.filter((i) => i.mimeType === 'application/vnd.google-apps.folder');
          const mappedFolders = folderItems.map((gf) => ({
            user_id: req.userId!,
            drive_account_id: account.id,
            google_folder_id: gf.id,
            parent_folder_id: gf.parents?.[0] || null,
            name: gf.name,
            path: `/${gf.name}`,
            color: '#4f46e5',
            created_at: gf.createdTime || new Date().toISOString(),
          }));
          db.syncDriveFolders(req.userId!, account.id, mappedFolders);
          totalSyncedFolders += mappedFolders.length;

          // 2. Sync Files
          const fileItems = googleItems.filter((i) => i.mimeType !== 'application/vnd.google-apps.folder');
          const mappedFiles = fileItems.map((gf) => ({
            user_id: req.userId!,
            drive_account_id: account.id,
            google_file_id: gf.id,
            folder_id: gf.parents?.[0] || null,
            name: gf.name,
            mime_type: gf.mimeType,
            size_bytes: gf.size ? parseInt(gf.size, 10) : 0,
            md5_checksum: gf.md5Checksum,
            web_view_link: gf.webViewLink,
            web_content_link: gf.webContentLink,
            thumbnail_link: gf.thumbnailLink,
            is_trashed: false,
            created_time: gf.createdTime || new Date().toISOString(),
            modified_time: gf.modifiedTime || new Date().toISOString(),
          }));
          db.syncDriveFiles(req.userId!, account.id, mappedFiles);
          totalSyncedFiles += mappedFiles.length;
        }
      } catch (driveErr) {
        console.warn(`Sync error for drive ${account.email}:`, driveErr);
      }
    }

    return res.json({
      message: 'All drives synchronized successfully',
      syncedDrivesCount: accounts.length,
      syncedFilesCount: totalSyncedFiles,
      syncedFoldersCount: totalSyncedFolders,
    });
  } catch (err: any) {
    console.error('Sync all error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync drives' });
  }
});

/**
 * Re-Sync Drive Quota, Folders, and Files from Google Drive API
 */
router.post('/drives/:id/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const account = db.getConnectedAccountById(req.params.id, req.userId!);
    if (!account) {
      return res.status(404).json({ error: 'Drive account not found' });
    }

    const accessToken = await GoogleDriveService.getValidAccessToken(account);
    const quota = await GoogleDriveService.getStorageQuota(accessToken);
    db.updateAccountQuota(account.id, quota.limit, quota.usage, quota.usageInDriveTrash);

    // Re-sync all folders & files from Google Drive
    const googleItems = await GoogleDriveService.listFiles(accessToken);

    // 1. Separate folders and sync
    const folderItems = googleItems.filter((i) => i.mimeType === 'application/vnd.google-apps.folder');
    const mappedFolders = folderItems.map((gf) => ({
      user_id: req.userId!,
      drive_account_id: account.id,
      google_folder_id: gf.id,
      parent_folder_id: gf.parents?.[0] || null,
      name: gf.name,
      path: `/${gf.name}`,
      color: '#4f46e5',
      created_at: gf.createdTime || new Date().toISOString(),
    }));
    db.syncDriveFolders(req.userId!, account.id, mappedFolders);

    // 2. Separate files and sync
    const fileItems = googleItems.filter((i) => i.mimeType !== 'application/vnd.google-apps.folder');
    const mappedFiles = fileItems.map((gf) => ({
      user_id: req.userId!,
      drive_account_id: account.id,
      google_file_id: gf.id,
      folder_id: gf.parents?.[0] || null,
      name: gf.name,
      mime_type: gf.mimeType,
      size_bytes: gf.size ? parseInt(gf.size, 10) : 0,
      md5_checksum: gf.md5Checksum,
      web_view_link: gf.webViewLink,
      web_content_link: gf.webContentLink,
      thumbnail_link: gf.thumbnailLink,
      is_trashed: false,
      created_time: gf.createdTime || new Date().toISOString(),
      modified_time: gf.modifiedTime || new Date().toISOString(),
    }));
    db.syncDriveFiles(req.userId!, account.id, mappedFiles);

    return res.json({ message: 'Drive synchronized successfully', filesCount: mappedFiles.length, foldersCount: mappedFolders.length });
  } catch (err: any) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync drive' });
  }
});

/**
 * Disconnect Google Drive Account
 */
router.delete('/drives/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const success = db.disconnectAccount(req.params.id, req.userId!);
  if (!success) {
    return res.status(404).json({ error: 'Drive account not found' });
  }
  return res.json({ message: 'Drive account disconnected successfully' });
});

// ----------------------------------------------------------------------------
// 4. UNIFIED FILE EXPLORER & ZERO-STORAGE STREAMING
// ----------------------------------------------------------------------------

/**
 * List files across all connected drives (Pooled view)
 */
router.get('/files', requireAuth, (req: AuthRequest, res: Response) => {
  const { driveId, search, category, folderId, sortBy, sortOrder } = req.query;
  const accounts = db.getConnectedAccounts(req.userId!);
  const accountsMap = new Map(accounts.map((a) => [a.id, a]));

  let files = db.getFiles(
    req.userId!,
    driveId ? String(driveId) : undefined,
    folderId ? String(folderId) : undefined
  );

  // Filter by category
  if (category && category !== 'all') {
    const cat = String(category).toLowerCase();
    files = files.filter((f) => {
      const mime = f.mime_type.toLowerCase();
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (cat === 'documents') {
        return (
          mime.includes('pdf') ||
          mime.includes('document') ||
          mime.includes('text') ||
          mime.includes('word') ||
          ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'].includes(ext)
        );
      }
      if (cat === 'spreadsheets') {
        return (
          mime.includes('sheet') ||
          mime.includes('excel') ||
          mime.includes('csv') ||
          ['xlsx', 'xls', 'csv'].includes(ext)
        );
      }
      if (cat === 'images') {
        return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext);
      }
      if (cat === 'videos') {
        return mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      }
      if (cat === 'audio') {
        return mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);
      }
      if (cat === 'archives') {
        return (
          mime.includes('zip') ||
          mime.includes('tar') ||
          mime.includes('compressed') ||
          ['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)
        );
      }
      return true;
    });
  }

  // Filter by search query
  if (search) {
    const q = String(search).toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(q));
  }

  // Enrich with drive info
  const enriched = files.map((f) => {
    const acc = accountsMap.get(f.drive_account_id);
    return {
      ...f,
      drive_email: acc ? acc.email : 'Unknown Account',
      drive_name: acc ? acc.name : 'Unknown Drive',
    };
  });

  // Sort files
  enriched.sort((a, b) => {
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
    if (sortBy === 'size') return (a.size_bytes - b.size_bytes) * order;
    return (new Date(b.modified_time).getTime() - new Date(a.modified_time).getTime()) * order;
  });

  return res.json({ files: enriched });
});

/**
 * ZERO-LOCAL-STORAGE DIRECT STREAMING UPLOAD PROXY
 * Pipes multipart stream chunks straight into Google Drive API v3 without writing to disk.
 */
router.post(['/files/upload', '/files/stream-upload'], requireAuth, async (req: AuthRequest, res: Response) => {
  const accounts = db.getConnectedAccounts(req.userId!);
  if (accounts.length === 0) {
    return res.status(400).json({ error: 'Please connect at least one Google Drive account first' });
  }

  try {
    const busboy = Busboy({ headers: req.headers });
    let targetDriveId = req.query.driveId as string | undefined;
    let targetFolderId = req.query.folderId as string | undefined;
    let autoBalance = req.query.autoBalance === 'true';

    let fileHandled = false;
    let uploadPromise: Promise<any> | null = null;

    busboy.on('field', (name, val) => {
      if (name === 'driveId' && val) targetDriveId = val;
      if (name === 'folderId' && val) targetFolderId = val;
      if (name === 'autoBalance' && val === 'true') autoBalance = true;
    });

    busboy.on('file', (name, fileStream, info) => {
      fileHandled = true;
      const { filename, mimeType } = info;

      uploadPromise = (async () => {
        // 1. Target Drive Selection: Auto-balance or Specific Drive
        let targetAccount: ConnectedAccountRecord | undefined;

        if (autoBalance || !targetDriveId || targetDriveId === 'auto') {
          // Select connected drive with highest free space (Auto-balancing storage pool!)
          const sortedByFree = [...accounts].sort((a, b) => {
            const freeA = a.drive_quota_total - a.drive_quota_used;
            const freeB = b.drive_quota_total - b.drive_quota_used;
            return freeB - freeA;
          });
          targetAccount = sortedByFree[0];
        } else {
          targetAccount = accounts.find((a) => a.id === targetDriveId);
        }

        if (!targetAccount) {
          targetAccount = accounts[0];
        }

        const creds = GoogleDriveService.getCredentials(req.userId);
        const isRealGCP =
          creds.clientId &&
          creds.clientSecret &&
          !targetAccount.encrypted_refresh_token.startsWith('demo_');

        if (isRealGCP) {
          // Real Google Drive API v3 Streaming Upload
          const accessToken = await GoogleDriveService.getValidAccessToken(targetAccount);
          const uploadedGFile = await GoogleDriveService.streamUploadFile(
            accessToken,
            fileStream,
            filename,
            mimeType,
            undefined,
            targetFolderId
          );

          // Save record in database
          const record = db.saveFile({
            user_id: req.userId!,
            drive_account_id: targetAccount.id,
            google_file_id: uploadedGFile.id,
            folder_id: targetFolderId || null,
            name: filename,
            mime_type: mimeType,
            size_bytes: uploadedGFile.size ? parseInt(uploadedGFile.size, 10) : 1024,
            md5_checksum: uploadedGFile.md5Checksum,
            web_view_link: uploadedGFile.webViewLink,
            web_content_link: uploadedGFile.webContentLink,
            thumbnail_link: uploadedGFile.thumbnailLink,
            is_trashed: false,
            created_time: new Date().toISOString(),
            modified_time: new Date().toISOString(),
          });

          // Refresh quota
          try {
            const quota = await GoogleDriveService.getStorageQuota(accessToken);
            db.updateAccountQuota(targetAccount.id, quota.limit, quota.usage, quota.usageInDriveTrash);
          } catch (e) {}

          // Run zero storage cleanup audit
          CleanupService.runCleanup('POST_UPLOAD_STREAMING_VERIFY');

          return record;
        } else {
          // In-memory stream consumption for Demo Drive (calculates exact byte size without disk write)
          let totalBytes = 0;
          for await (const chunk of fileStream) {
            totalBytes += chunk.length;
          }

          const record = db.saveFile({
            user_id: req.userId!,
            drive_account_id: targetAccount.id,
            google_file_id: `gfile_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            folder_id: targetFolderId || null,
            name: filename,
            mime_type: mimeType,
            size_bytes: totalBytes || 1024 * 50,
            web_view_link: 'https://drive.google.com',
            web_content_link: 'https://drive.google.com',
            is_trashed: false,
            created_time: new Date().toISOString(),
            modified_time: new Date().toISOString(),
          });

          // Update target account quota
          const newUsed = (targetAccount.drive_quota_used || 0) + (totalBytes || 1024 * 50);
          db.updateAccountQuota(targetAccount.id, targetAccount.drive_quota_total, newUsed);

          // Verify zero local files
          CleanupService.runCleanup('POST_UPLOAD_DEMO_STREAMING_VERIFY');

          return record;
        }
      })();
    });

    busboy.on('finish', async () => {
      if (!fileHandled || !uploadPromise) {
        return res.status(400).json({ error: 'No file was streamed in upload request' });
      }
      try {
        const fileRecord = await uploadPromise;
        return res.status(201).json({
          message: 'File streamed directly into Google Drive with zero local storage retention',
          file: fileRecord,
        });
      } catch (err: any) {
        console.error('Streaming upload error:', err);
        return res.status(500).json({ error: err.message || 'Streaming upload failed' });
      }
    });

    busboy.on('error', (err: any) => {
      console.error('Busboy error:', err);
      return res.status(500).json({ error: 'Error parsing multipart stream' });
    });

    req.pipe(busboy);
  } catch (err: any) {
    console.error('Upload route error:', err);
    return res.status(500).json({ error: err.message || 'Upload proxy error' });
  }
});

/**
 * Direct Streaming Download from Google Drive
 */
router.get('/files/download/:fileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const file = db.getFileById(req.params.fileId, req.userId!);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const account = db.getConnectedAccountById(file.drive_account_id, req.userId!);
    if (!account) {
      return res.status(404).json({ error: 'Associated Google Drive account is disconnected' });
    }

    const accessToken = await GoogleDriveService.getValidAccessToken(account);
    const download = await GoogleDriveService.streamDownloadFile(accessToken, file.google_file_id);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    if (file.size_bytes) {
      res.setHeader('Content-Length', file.size_bytes.toString());
    }

    if (download.stream) {
      // @ts-expect-error Readable.fromWeb supports web streams
      Readable.fromWeb(download.stream).pipe(res);
    } else {
      return res.status(500).send('Empty stream returned from Google Drive');
    }
  } catch (err: any) {
    console.error('Download error:', err);
    return res.status(500).json({ error: err.message || 'Failed to stream file download' });
  }
});

/**
 * Inline File Preview & Media Stream (Images, Videos, PDFs, Audio, etc.)
 */
router.get(['/files/preview/:fileId', '/files/stream/:fileId'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const file = db.getFileById(req.params.fileId, req.userId!);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const account = db.getConnectedAccountById(file.drive_account_id, req.userId!);
    if (!account) {
      return res.status(404).json({ error: 'Drive account not found' });
    }

    const accessToken = await GoogleDriveService.getValidAccessToken(account);
    const rangeHeader = req.headers.range;
    const download = await GoogleDriveService.streamDownloadFile(accessToken, file.google_file_id, rangeHeader);

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const contentRange = download.headers.get('content-range');
    const contentLength = download.headers.get('content-length');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    else if (file.size_bytes && !rangeHeader) res.setHeader('Content-Length', file.size_bytes.toString());

    res.status(download.status || 200);

    if (download.stream) {
      // @ts-expect-error Readable.fromWeb
      Readable.fromWeb(download.stream).pipe(res);
    } else {
      res.status(500).send('Unable to stream preview from Google Drive');
    }
  } catch (err: any) {
    console.error('Preview error:', err);
    return res.status(500).json({ error: err.message || 'Preview streaming failed' });
  }
});

/**
 * Delete File from Google Drive and Catalog
 */
router.delete('/files/:fileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const file = db.getFileById(req.params.fileId, req.userId!);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const account = db.getConnectedAccountById(file.drive_account_id, req.userId!);
    if (account) {
      const creds = GoogleDriveService.getCredentials(req.userId);
      if (creds.clientId && creds.clientSecret && !account.encrypted_refresh_token.startsWith('demo_')) {
        try {
          const accessToken = await GoogleDriveService.getValidAccessToken(account);
          await GoogleDriveService.deleteFile(accessToken, file.google_file_id);
          const quota = await GoogleDriveService.getStorageQuota(accessToken);
          db.updateAccountQuota(account.id, quota.limit, quota.usage, quota.usageInDriveTrash);
        } catch (delErr) {
          console.warn('Google Drive delete error:', delErr);
        }
      } else {
        const newUsed = Math.max(0, (account.drive_quota_used || 0) - file.size_bytes);
        db.updateAccountQuota(account.id, account.drive_quota_total, newUsed);
      }
    }

    db.deleteFile(file.id, req.userId!);
    return res.json({ message: 'File deleted from Google Drive successfully' });
  } catch (err: any) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

/**
 * List Folders for Current User
 */
router.get('/folders', requireAuth, (req: AuthRequest, res: Response) => {
  const { driveId } = req.query;
  const folders = db.getFolders(req.userId!, driveId ? String(driveId) : undefined);
  return res.json({ folders });
});

/**
 * Create Virtual Folder / Drive Folder
 */
router.post('/folders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, driveId, parentFolderId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const accounts = db.getConnectedAccounts(req.userId!);
    const targetAccount = driveId ? accounts.find((a) => a.id === driveId) : accounts[0];

    if (!targetAccount) {
      return res.status(400).json({ error: 'No connected Google Drive account available' });
    }

    const creds = GoogleDriveService.getCredentials(req.userId);
    let googleFolderId = `fld_${Date.now()}`;

    if (creds.clientId && creds.clientSecret && !targetAccount.encrypted_refresh_token.startsWith('demo_')) {
      try {
        const accessToken = await GoogleDriveService.getValidAccessToken(targetAccount);
        const created = await GoogleDriveService.createFolder(accessToken, name, parentFolderId);
        googleFolderId = created.id;
      } catch (fldErr) {
        console.warn('Google Drive create folder error, creating local folder record:', fldErr);
      }
    }

    const folder = db.saveFolder({
      user_id: req.userId!,
      drive_account_id: targetAccount.id,
      google_folder_id: googleFolderId,
      name: name.trim(),
      parent_folder_id: parentFolderId || null,
      path: `/${name.trim()}`,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({ folder });
  } catch (err: any) {
    console.error('Create folder error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create folder' });
  }
});

/**
 * Delete Virtual Folder
 */
router.delete('/folders/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const folder = db.getFolderById(req.params.id, req.userId!);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  db.deleteFolder(req.params.id, req.userId!);
  return res.json({ message: 'Folder deleted successfully' });
});

// ----------------------------------------------------------------------------
// 5. AUDIT, SCHEMA & SYSTEM METRICS
// ----------------------------------------------------------------------------

/**
 * Inspect SQL Database Schema DDL & Table Stats
 */
router.get('/admin/schema', (req: Request, res: Response) => {
  return res.json({
    ddl: SQL_SCHEMA_DDL,
    tables: [
      {
        name: 'users',
        description: 'Isolated user accounts with bcrypt hashed passwords',
        columns: ['id (PK)', 'email (UNIQUE)', 'password_hash', 'name', 'created_at', 'updated_at'],
      },
      {
        name: 'connected_google_accounts',
        description: 'Persistent OAuth 2.0 credentials with AES-256-GCM encrypted refresh tokens',
        columns: [
          'id (PK)',
          'user_id (FK)',
          'google_user_id',
          'email',
          'name',
          'avatar_url',
          'encrypted_refresh_token',
          'token_iv',
          'token_auth_tag',
          'drive_quota_total',
          'drive_quota_used',
          'is_primary',
          'is_active',
          'last_synced_at',
        ],
      },
      {
        name: 'folders',
        description: 'Virtual folder hierarchy and mapped Google Drive parent folders',
        columns: ['id (PK)', 'user_id (FK)', 'drive_account_id (FK)', 'google_folder_id', 'name', 'parent_folder_id', 'path'],
      },
      {
        name: 'files',
        description: 'Unified file catalog indexed across all connected user Google Drives',
        columns: [
          'id (PK)',
          'user_id (FK)',
          'drive_account_id (FK)',
          'google_file_id',
          'folder_id',
          'name',
          'mime_type',
          'size_bytes',
          'web_view_link',
          'is_trashed',
          'created_time',
          'modified_time',
        ],
      },
      {
        name: 'cleanup_logs',
        description: 'Automated cleanup execution logs proving zero local disk storage retention',
        columns: ['id (PK)', 'trigger_reason', 'status', 'details', 'created_at'],
      },
    ],
  });
});

/**
 * Audit zero-storage status (for dashboard data refresh)
 */
router.get('/audit/zero-storage', requireAuth, (req: AuthRequest, res: Response) => {
  const audit = CleanupService.runCleanup('DASHBOARD_DATA_REFRESH_AUDIT');
  return res.json({ audit });
});

/**
 * Run Automated Zero-Disk Cleanup & Return Audit Verification
 */
router.get('/admin/cleanup', requireAuth, (req: AuthRequest, res: Response) => {
  const audit = CleanupService.runCleanup('MANUAL_USER_AUDIT_REQUEST');
  const logs = db.getCleanupLogs();
  return res.json({ audit, logs });
});

export default router;
