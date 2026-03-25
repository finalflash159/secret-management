import fs from 'node:fs/promises';
import { chromium, type FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_STORAGE_PATH,
  E2E_BASE_URL,
  E2E_FIXTURE_PATH,
  E2E_MEMBER_EMAIL,
  E2E_MEMBER_PASSWORD,
  E2E_MEMBER_STORAGE_PATH,
  E2E_GLOBAL_ALERT_TITLE,
  E2E_ORG_ALERT_TITLE,
  E2E_PROJECT_ALERT_COUNT,
  E2E_PROJECT_ALERT_TITLE_PREFIX,
  E2E_ORG_NAME,
  E2E_ORG_SLUG,
  E2E_PROJECT_NAME,
  E2E_PROJECT_SLUG,
  E2E_RUNTIME_DIR,
} from './test-config';

const prisma = new PrismaClient();

const DEFAULT_ROLE_FIXTURES = [
  {
    slug: 'admin',
    name: 'Admin',
    permissions: [
      'secret:read',
      'secret:write',
      'secret:delete',
      'folder:manage',
      'member:manage',
      'settings:manage',
    ],
    isDefault: false,
  },
  {
    slug: 'developer',
    name: 'Developer',
    permissions: ['secret:read', 'secret:write', 'folder:manage'],
    isDefault: false,
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    permissions: ['secret:read'],
    isDefault: true,
  },
] as const;

async function loginForStorageState(
  email: string,
  password: string,
  storagePath: string
) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${E2E_BASE_URL}/login`);
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Click submit and wait for redirect
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

  // Call session from inside the browser so the session cookie is sent
  const session = await page.evaluate(async (baseUrl) => {
    const resp = await fetch(`${baseUrl}/api/auth/session`);
    return resp.json();
  }, E2E_BASE_URL);

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
  await fs.writeFile(storagePath, JSON.stringify(storage, null, 2));
  await browser.close();
}

async function ensureUser(
  email: string,
  password: string,
  name: string,
  isMasterAdmin: boolean
) {
  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      isMasterAdmin,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      isMasterAdmin,
    },
  });
}

async function ensureProjectRole(
  projectId: string,
  role: (typeof DEFAULT_ROLE_FIXTURES)[number]
) {
  return prisma.role.upsert({
    where: {
      projectId_slug: {
        projectId,
        slug: role.slug,
      },
    },
    update: {
      name: role.name,
      permissions: role.permissions,
      isDefault: role.isDefault,
    },
    create: {
      projectId,
      slug: role.slug,
      name: role.name,
      permissions: role.permissions,
      isDefault: role.isDefault,
    },
  });
}

async function ensureFixtureData() {
  const admin = await ensureUser(
    E2E_ADMIN_EMAIL,
    E2E_ADMIN_PASSWORD,
    'E2E Admin',
    true
  );
  const member = await ensureUser(
    E2E_MEMBER_EMAIL,
    E2E_MEMBER_PASSWORD,
    'E2E Member',
    false
  );

  const organization = await prisma.organization.upsert({
    where: { slug: E2E_ORG_SLUG },
    update: { name: E2E_ORG_NAME },
    create: {
      name: E2E_ORG_NAME,
      slug: E2E_ORG_SLUG,
    },
  });

  await prisma.orgMember.upsert({
    where: {
      userId_orgId: {
        userId: admin.id,
        orgId: organization.id,
      },
    },
    update: { role: 'owner' },
    create: {
      userId: admin.id,
      orgId: organization.id,
      role: 'owner',
    },
  });

  await prisma.orgMember.upsert({
    where: {
      userId_orgId: {
        userId: member.id,
        orgId: organization.id,
      },
    },
    update: { role: 'member' },
    create: {
      userId: member.id,
      orgId: organization.id,
      role: 'member',
    },
  });

  const project = await prisma.project.upsert({
    where: {
      orgId_slug: {
        orgId: organization.id,
        slug: E2E_PROJECT_SLUG,
      },
    },
    update: {
      name: E2E_PROJECT_NAME,
      ownerId: admin.id,
    },
    create: {
      name: E2E_PROJECT_NAME,
      slug: E2E_PROJECT_SLUG,
      orgId: organization.id,
      ownerId: admin.id,
    },
  });

  await prisma.project.deleteMany({
    where: {
      orgId: organization.id,
      slug: {
        startsWith: 'e2e-test-',
      },
    },
  });

  const [adminRole, viewerRole] = await Promise.all(
    DEFAULT_ROLE_FIXTURES.map((role) => ensureProjectRole(project.id, role))
  ).then((roles) => [
    roles.find((role) => role.slug === 'admin'),
    roles.find((role) => role.slug === 'viewer'),
  ]);

  if (!adminRole || !viewerRole) {
    throw new Error('Failed to create project roles for E2E fixture');
  }

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: admin.id,
        projectId: project.id,
      },
    },
    update: { roleId: adminRole.id },
    create: {
      userId: admin.id,
      projectId: project.id,
      roleId: adminRole.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: member.id,
        projectId: project.id,
      },
    },
    update: { roleId: viewerRole.id },
    create: {
      userId: member.id,
      projectId: project.id,
      roleId: viewerRole.id,
    },
  });

  const environments = [
    { slug: 'dev', name: 'Development' },
    { slug: 'staging', name: 'Staging' },
    { slug: 'prod', name: 'Production' },
  ];

  for (const environment of environments) {
    await prisma.projectEnvironment.upsert({
      where: {
        projectId_slug: {
          projectId: project.id,
          slug: environment.slug,
        },
      },
      update: { name: environment.name },
      create: {
        projectId: project.id,
        slug: environment.slug,
        name: environment.name,
      },
    });
  }

  await prisma.secret.deleteMany({
    where: { projectId: project.id },
  });

  await prisma.alert.deleteMany({
    where: {
      userId: admin.id,
      OR: [
        {
          title: {
            in: [E2E_ORG_ALERT_TITLE, E2E_GLOBAL_ALERT_TITLE],
          },
        },
        {
          title: {
            startsWith: E2E_PROJECT_ALERT_TITLE_PREFIX,
          },
        },
      ],
    },
  });

  await prisma.alert.create({
    data: {
      userId: admin.id,
      orgId: organization.id,
      type: 'info',
      title: E2E_ORG_ALERT_TITLE,
      message: 'Scoped to the organization alerts page',
      read: false,
    },
  });

  await prisma.alert.create({
    data: {
      userId: admin.id,
      type: 'info',
      title: E2E_GLOBAL_ALERT_TITLE,
      message: 'Only visible on the global alerts page',
      read: false,
    },
  });

  for (let index = 1; index <= E2E_PROJECT_ALERT_COUNT; index += 1) {
    const suffix = String(index).padStart(2, '0');

    await prisma.alert.create({
      data: {
        userId: admin.id,
        orgId: organization.id,
        projectId: project.id,
        type: 'info',
        title: `${E2E_PROJECT_ALERT_TITLE_PREFIX}${suffix}`,
        message: `Project-scoped alert ${suffix}`,
        read: false,
      },
    });
  }

  await fs.mkdir(E2E_RUNTIME_DIR, { recursive: true });
  await fs.writeFile(
    E2E_FIXTURE_PATH,
    JSON.stringify(
      {
        organizationId: organization.id,
        orgSlug: organization.slug,
        projectId: project.id,
        projectSlug: project.slug,
        adminEmail: admin.email,
        memberEmail: member.email,
      },
      null,
      2
    )
  );
}

export default async (_config: FullConfig): Promise<void> => {
  console.log('Setting up Playwright fixtures and auth state...');

  await prisma.$connect();
  try {
    await ensureFixtureData();
  } finally {
    await prisma.$disconnect();
  }

  await loginForStorageState(
    E2E_ADMIN_EMAIL,
    E2E_ADMIN_PASSWORD,
    E2E_ADMIN_STORAGE_PATH
  );
  await loginForStorageState(
    E2E_MEMBER_EMAIL,
    E2E_MEMBER_PASSWORD,
    E2E_MEMBER_STORAGE_PATH
  );
};
