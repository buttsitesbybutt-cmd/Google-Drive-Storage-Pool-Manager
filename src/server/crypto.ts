import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM

const DEFAULT_SECRET = 'google-drive-storage-pool-manager-super-secret-key-32bytes';

// Get or derive a 32-byte encryption key
function getEncryptionKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const primarySecret = process.env.ENCRYPTION_KEY || DEFAULT_SECRET;
  keys.push(crypto.createHash('sha256').update(String(primarySecret)).digest());

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY !== DEFAULT_SECRET) {
    // Add default fallback key in case data was encrypted under default key
    keys.push(crypto.createHash('sha256').update(DEFAULT_SECRET).digest());
  }

  return keys;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  packed: string;
}

/**
 * Encrypt sensitive OAuth tokens using AES-256-GCM with authenticated IV & auth tag.
 */
export function encryptToken(text: string): EncryptedData {
  if (!text) {
    return { encrypted: '', iv: '', authTag: '', packed: '' };
  }
  const keys = getEncryptionKeys();
  const key = keys[0];
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  const packed = `${ivHex}:${authTag}:${encrypted}`;

  return {
    encrypted,
    iv: ivHex,
    authTag,
    packed,
  };
}

/**
 * Decrypt AES-256-GCM encrypted tokens, validating integrity with auth tag.
 * Supports separate (encrypted, iv, authTag) arguments as well as self-contained packed format (iv:authTag:encrypted).
 */
export function decryptToken(encryptedOrPacked: string, iv?: string, authTag?: string): string {
  if (!encryptedOrPacked) {
    return '';
  }

  let cipherText = encryptedOrPacked;
  let ivHex = iv;
  let tagHex = authTag;

  // Check if string is in packed format "iv:authTag:cipherText"
  if ((!ivHex || !tagHex) && encryptedOrPacked.includes(':')) {
    const parts = encryptedOrPacked.split(':');
    if (parts.length === 3) {
      ivHex = parts[0];
      tagHex = parts[1];
      cipherText = parts[2];
    }
  }

  if (!cipherText || !ivHex || !tagHex) {
    return '';
  }

  const keys = getEncryptionKeys();
  let lastError: any = null;

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      let decrypted = decipher.update(cipherText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Decryption failed (token may be corrupted or key changed):', lastError);
  throw new Error('Failed to decrypt authentication token');
}
