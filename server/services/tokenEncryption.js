/**
 * Token Encryption Service — AES-256-GCM
 *
 * Encrypts/decrypts OAuth tokens before storing in the database.
 * Uses AES-256-GCM for authenticated encryption with random IVs.
 *
 * Env vars:
 *   ENCRYPTION_KEY — 64-char hex string (32 bytes). Auto-generated if missing.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;   // 128-bit auth tag

/**
 * Get or derive the encryption key.
 * In production, ENCRYPTION_KEY must be a 64-char hex string (32 bytes).
 * Falls back to a deterministic key derived from JWT_SECRET (not recommended for prod).
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }

  if (envKey) {
    console.warn('[TokenEncryption] ENCRYPTION_KEY must be 64 hex chars — falling back to JWT_SECRET derivation');
  }

  // Fallback: derive from JWT_SECRET using simple hash
  const { createHash } = await import('node:crypto');
  const secret = process.env.JWT_SECRET || 'task360-default-key';
  return createHash('sha256').update(secret).digest();
}

// Lazy-init key (top-level await not used to keep compatibility)
let _key = null;

async function ensureKey() {
  if (!_key) {
    _key = await getEncryptionKey();
  }
  return _key;
}

/**
 * Encrypt a plaintext string.
 * Output format: base64(IV + ciphertext + authTag)
 *
 * @param {string} plaintext
 * @returns {Promise<string>} Encrypted token as base64
 */
export async function encryptToken(plaintext) {
  if (!plaintext) return null;

  const key = await ensureKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: IV (12) + ciphertext (variable) + authTag (16)
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return packed.toString('base64');
}

/**
 * Decrypt an encrypted token.
 *
 * @param {string} encryptedBase64
 * @returns {Promise<string|null>} Decrypted plaintext, or null on failure
 */
export async function decryptToken(encryptedBase64) {
  if (!encryptedBase64) return null;

  try {
    const key = await ensureKey();
    const packed = Buffer.from(encryptedBase64, 'base64');

    if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      console.error('[TokenEncryption] Encrypted data too short');
      return null;
    }

    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[TokenEncryption] Decryption failed:', err.message);
    return null;
  }
}
