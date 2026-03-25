import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PORT = Number.parseInt(process.env.APP_PORT || '3002', 10);

export const E2E_BASE_URL =
  process.env.APP_BASE_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
export const E2E_RUNTIME_DIR = path.join(process.cwd(), 'e2e', '.runtime');
export const E2E_ADMIN_STORAGE_PATH = path.join(
  E2E_RUNTIME_DIR,
  'admin-storage.json'
);
export const E2E_MEMBER_STORAGE_PATH = path.join(
  E2E_RUNTIME_DIR,
  'member-storage.json'
);
export const E2E_FIXTURE_PATH = path.join(E2E_RUNTIME_DIR, 'fixture.json');

export const E2E_ADMIN_EMAIL = 'admin@gondor.dev';
export const E2E_ADMIN_PASSWORD = 'Admin123456!';
export const E2E_MEMBER_EMAIL = 'member@test.dev';
export const E2E_MEMBER_PASSWORD = 'Member123456!';
export const E2E_ORG_NAME = 'Test Org';
export const E2E_ORG_SLUG = 'test-org';
export const E2E_PROJECT_NAME = 'Test Project';
export const E2E_PROJECT_SLUG = 'test-project';
export const E2E_ORG_ALERT_TITLE = 'E2E Org Scoped Alert';
export const E2E_GLOBAL_ALERT_TITLE = 'E2E Global Alert';
export const E2E_PROJECT_ALERT_TITLE_PREFIX = 'E2E Project Scoped Alert ';
export const E2E_PROJECT_ALERT_COUNT = 22;

export interface RuntimeFixture {
  organizationId: string;
  orgSlug: string;
  projectId: string;
  projectSlug: string;
  adminEmail: string;
  memberEmail: string;
}

export function readRuntimeFixture(): RuntimeFixture {
  return JSON.parse(fs.readFileSync(E2E_FIXTURE_PATH, 'utf8')) as RuntimeFixture;
}
