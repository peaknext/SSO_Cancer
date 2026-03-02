import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const logger = new Logger('CryptoUtil');
let keyWarningLogged = false;

function getEncryptionKey(): Buffer | null {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key) return null;
  if (key.length < 64) {
    if (!keyWarningLogged) {
      logger.warn(
        'SETTINGS_ENCRYPTION_KEY must be at least 64 hex chars (256 bits). ' +
        'Generate with: openssl rand -hex 32',
      );
      keyWarningLogged = true;
    }
    return null;
  }
  // Use first 32 bytes (256 bits) of the hex key
  return Buffer.from(key.slice(0, 64), 'hex');
}

/**
 * Encrypt a plaintext string. Returns base64-encoded ciphertext with IV and auth tag.
 * If no encryption key is configured, returns the plaintext as-is (graceful degradation).
 */
export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  // Format: base64(iv + tag + ciphertext)
  const combined = Buffer.concat([iv, tag, encrypted]);
  return 'enc:' + combined.toString('base64');
}

/**
 * Decrypt a value. If it doesn't start with 'enc:', return as-is (legacy unencrypted).
 */
export function decryptValue(ciphertext: string): string {
  if (!ciphertext.startsWith('enc:')) return ciphertext;

  const key = getEncryptionKey();
  if (!key) {
    // No key configured but data is encrypted — return masked
    return '••••••••';
  }

  try {
    const combined = Buffer.from(ciphertext.slice(4), 'base64');
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    return '••••••••';
  }
}
