import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns format: "iv:authTag:encryptedData" (all base64/hex encoded)
 */
export function encrypt(plaintext: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET not set in environment variables');
  }

  // Derive a 256-bit key from the secret
  const key = crypto
    .createHash('sha256')
    .update(secret)
    .digest();

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine: base64(iv):base64(authTag):hex(encrypted)
  const combined = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

  return combined;
}

/**
 * Decrypts an encrypted string created by encrypt()
 * Expects format: "iv:authTag:encryptedData"
 */
export function decrypt(encrypted: string): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET not set in environment variables');
  }

  try {
    // Split the combined string
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encryptedHex] = parts;

    // Derive the same key
    const key = crypto
      .createHash('sha256')
      .update(secret)
      .digest();

    // Decode IV and auth tag
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}