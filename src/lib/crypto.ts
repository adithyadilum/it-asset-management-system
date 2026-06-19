import crypto from 'crypto';
import { serverEnv } from '@/lib/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const secret = serverEnv.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET not set in environment variables');
  }

  // Directly decode the base64 secret into a 32-byte Buffer
  const key = Buffer.from(secret, 'base64');

  if (key.length !== 32) {
    throw new Error(
      'ENCRYPTION_SECRET must be exactly 32 bytes (base64 encoded)'
    );
  }

  cachedKey = key;
  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns format: "iv:authTag:encryptedData" (all base64/hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string created by encrypt()
 * Expects format: "iv:authTag:encryptedData"
 */
export function decrypt(encrypted: string): string {
  try {
    const key = getKey();
    const parts = encrypted.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encryptedHex] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}
