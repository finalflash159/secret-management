/**
 * Application configuration
 */

// Default environments for new projects
export const DEFAULT_ENVIRONMENTS = [
  { name: 'Development', slug: 'dev' },
  { name: 'Staging', slug: 'staging' },
  { name: 'Production', slug: 'prod' },
];

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
};

// Project limits
export const PROJECT_LIMITS = {
  MAX_SECRETS_PER_PROJECT: 10000,
  MAX_FOLDERS_PER_PROJECT: 1000,
  MAX_MEMBERS_PER_PROJECT: 100,
  MAX_ENVIRONMENTS_PER_PROJECT: 20,
};

// Password requirements
export const PASSWORD = {
  MIN_LENGTH: 8,
  BCRYPT_ROUNDS: 12,
};

// Encryption
export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  SALT_LENGTH: 32,
  ITERATIONS: 100000,
};

// API Rate limiting (optional - can be implemented with Redis)
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
};

// Audit log retention (days)
export const AUDIT_RETENTION_DAYS = 90;
