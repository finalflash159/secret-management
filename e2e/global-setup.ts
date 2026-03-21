import { chromium, FullConfig } from '@playwright/test';

const BASE = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@gondor.dev';
const ADMIN_PASS = 'Admin123456!';
const MEMBER_EMAIL = 'member@test.dev';
const MEMBER_PASS = 'Member123456!';

async function loginForStorageState(email: string, password: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`);
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Click submit and wait for redirect
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

  // Call session from inside the browser so the session cookie is sent
  const session = await page.evaluate(async (base) => {
    const resp = await fetch(`${base}/api/auth/session`);
    return resp.json();
  }, BASE);

  if (!session?.user) {
    throw new Error(`Login failed for ${email}: session = ${JSON.stringify(session)}`);
  }

  // Wait for the session cookie to be persisted in the context
  await page.waitForTimeout(500);
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name.includes('session-token'));
  if (!sessionCookie) {
    throw new Error(`Session cookie not set for ${email}. Cookies: ${cookies.map((c) => c.name).join(', ')}`);
  }

  // Save storage state
  const storage = await context.storageState();
  await browser.close();
  return storage;
}

export default async (_config: FullConfig): Promise<void> => {
  console.log('Setting up Playwright RBAC test sessions...');

  const adminStorage = await loginForStorageState(ADMIN_EMAIL, ADMIN_PASS);
  const memberStorage = await loginForStorageState(MEMBER_EMAIL, MEMBER_PASS);

  const fs = await import('fs');
  fs.writeFileSync('e2e/.admin-storage.json', JSON.stringify(adminStorage));
  fs.writeFileSync('e2e/.member-storage.json', JSON.stringify(memberStorage));
  console.log(
    `Session files created: e2e/.admin-storage.json (${adminStorage.cookies.length} cookies), e2e/.member-storage.json (${memberStorage.cookies.length} cookies)`
  );
};
