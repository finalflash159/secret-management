import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function getMasterKey(): Buffer {
  const key = process.env.MASTER_KEY;
  if (!key) {
    throw new Error('MASTER_KEY environment variable is not set');
  }
  // Ensure the key is exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Derive a key from password using PBKDF2
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Generate a random salt
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Generate a random encryption key for a project
 */
export function generateProjectKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: { ciphertext: string, iv: string, tag: string }
 */
export function encrypt(plaintext: string, key: Buffer = getMasterKey()): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decrypt(
  ciphertext: string,
  key: Buffer = getMasterKey(),
  iv: string,
  tag: string
): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt project key with master key
 */
export function encryptProjectKey(projectKey: Buffer): {
  encryptedKey: string;
  iv: string;
  tag: string;
} {
  return encrypt(projectKey.toString('base64'));
}

/**
 * Decrypt project key with master key
 */
export function decryptProjectKey(
  encryptedKey: string,
  iv: string,
  tag: string
): Buffer {
  const decrypted = decrypt(encryptedKey, getMasterKey(), iv, tag);
  return Buffer.from(decrypted, 'base64');
}

/**
 * Hash password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
