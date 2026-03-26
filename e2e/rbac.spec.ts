import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_STORAGE_PATH,
  E2E_MEMBER_STORAGE_PATH,
  E2E_ORG_SLUG,
  E2E_PROJECT_TEMP_EMAIL,
  readRuntimeFixture,
} from './test-config';

const ORG_SLUG = E2E_ORG_SLUG;

interface ProjectRole {
  id: string;
  slug: string;
  name: string;
}

interface ProjectMemberRecord {
  id: string;
  user: {
    email: string;
  };
  role: {
    slug: string;
  };
}

function getProjectId() {
  return readRuntimeFixture().projectId;
}

// ─── Admin RBAC UI Tests ──────────────────────────────────────────────────────

test.describe('Admin RBAC UI', () => {
  test.use({ storageState: E2E_ADMIN_STORAGE_PATH });

  test('Admin can see "New Project" button on org page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    const newProjectBtn = page
      .getByRole('link', { name: /new project/i })
      .or(page.getByRole('button', { name: /new project/i }));
    await expect(newProjectBtn).toBeVisible();
  });

  test('Admin can see "Settings" in org header', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('link', { name: /settings/i }).first()).toBeVisible();
  });

  test('Admin can access /settings page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/settings`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Admin can access /members page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/members`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible({ timeout: 5000 });
  });

  test('Admin can see "Invite Member" on members page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/members`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(
      page.getByRole('button', { name: /invite member/i }).or(page.getByRole('link', { name: /invite member/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Admin can access /integrations page (no block)', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/integrations`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin can access /invitations page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/invitations`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin can access /access-control page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/access-control`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin can access /dynamic-secrets page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/dynamic-secrets`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('Admin can see project detail page with secrets', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/projects/${getProjectId()}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/404/i)).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── Member RBAC UI Tests ───────────────────────────────────────────────────

test.describe('Member RBAC UI', () => {
  test.use({ storageState: E2E_MEMBER_STORAGE_PATH });

  test('Member can see org page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
  });

  test('Member CANNOT see "New Project" button on org page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    const btn = page
      .getByRole('link', { name: /new project/i })
      .or(page.getByRole('button', { name: /new project/i }));
    await expect(btn).not.toBeVisible({ timeout: 3000 });
  });

  test('Member CANNOT see "Settings" link in org header', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('link', { name: /^settings$/i })).not.toBeVisible({ timeout: 3000 });
  });

  test('Member is BLOCKED from /settings page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/settings`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member CANNOT see "Invite Member" button', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/members`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(
      page.getByRole('button', { name: /invite member/i }).or(page.getByRole('link', { name: /invite member/i }))
    ).not.toBeVisible({ timeout: 3000 });
  });

  test('Member is BLOCKED from /integrations page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/integrations`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member is BLOCKED from /invitations page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/invitations`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member is BLOCKED from /access-control page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/access-control`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member is BLOCKED from /dynamic-secrets page', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/dynamic-secrets`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member is BLOCKED from /folders page if no accessible projects', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/folders`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 5000 });
  });

  test('Member sees project page but with no secrets', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}/projects/${getProjectId()}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await expect(page.getByText(/404/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/no secrets/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Member CAN see global alerts page', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/404/i)).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── E2E Flow Tests ──────────────────────────────────────────────────────────

test.describe('E2E — Admin flows', () => {
  test.use({ storageState: E2E_ADMIN_STORAGE_PATH });

  test('Admin can create a project and see it in the org page', async ({ page }) => {
    const projectName = `E2E Test Project ${Date.now()}`;
    const projectSlug = `e2e-test-${Date.now()}`;

    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Click New Project button
    const newProjectBtn = page
      .getByRole('link', { name: /new project/i })
      .or(page.getByRole('button', { name: /new project/i }));
    await newProjectBtn.click();
    await page.waitForTimeout(500);

    // Fill project form
    const nameInput = page.locator('input[id="name"]');
    await nameInput.waitFor({ timeout: 5000 });
    await nameInput.fill(projectName);

    const slugInput = page.locator('input[id="slug"]');
    await slugInput.waitFor({ timeout: 5000 });
    await slugInput.fill(projectSlug);

    // Submit
    await page.getByRole('button', { name: /create/i }).click();
    await page.waitForTimeout(3000);

    // Page refreshes org list — project should appear
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 8000 });
  });

  test('Admin can see Add Secret button on project page', async ({ page }) => {
    // Admin should be able to see the Add Secret button on their project
    await page.goto(`/organizations/${ORG_SLUG}/projects/${getProjectId()}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Verify page loaded and no access restriction
    await expect(page.getByText(/404/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/access restricted/i)).not.toBeVisible({ timeout: 3000 });

    // Add Secret button should be visible for project admin/owner
    await expect(
      page.getByRole('button', { name: /add secret/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Admin can update and remove project members through nested member routes', async ({ page }) => {
    const projectId = getProjectId();
    await page.goto(`/organizations/${ORG_SLUG}/projects/${projectId}`);
    await page.waitForLoadState('load');

    const rolesResponse = await page.request.get(`/api/projects/${projectId}/roles`);
    expect(rolesResponse.ok()).toBeTruthy();
    const rolesJson = await rolesResponse.json();
    const roles = (rolesJson.data ?? rolesJson) as ProjectRole[];
    const viewerRole = roles.find((role) => role.slug === 'viewer');
    const developerRole = roles.find((role) => role.slug === 'developer');

    expect(viewerRole).toBeTruthy();
    expect(developerRole).toBeTruthy();

    const addResponse = await page.request.post(`/api/projects/${projectId}/members`, {
      data: {
        email: E2E_PROJECT_TEMP_EMAIL,
        roleId: viewerRole!.id,
      },
    });
    expect(addResponse.status()).toBe(201);
    const addJson = await addResponse.json();
    const createdMember = (addJson.data ?? addJson) as ProjectMemberRecord;
    expect(createdMember.user.email).toBe(E2E_PROJECT_TEMP_EMAIL);

    const updateResponse = await page.request.patch(
      `/api/projects/${projectId}/members/${createdMember.id}`,
      {
        data: { roleId: developerRole!.id },
      }
    );
    expect(updateResponse.ok()).toBeTruthy();
    const updateJson = await updateResponse.json();
    const updatedMember = (updateJson.data ?? updateJson) as ProjectMemberRecord;
    expect(updatedMember.role.slug).toBe('developer');

    const membersAfterUpdateResponse = await page.request.get(
      `/api/projects/${projectId}/members`
    );
    expect(membersAfterUpdateResponse.ok()).toBeTruthy();
    const membersAfterUpdateJson = await membersAfterUpdateResponse.json();
    const membersAfterUpdate = (
      membersAfterUpdateJson.data ?? membersAfterUpdateJson
    ) as ProjectMemberRecord[];
    const refreshedMember = membersAfterUpdate.find(
      (member) => member.user.email === E2E_PROJECT_TEMP_EMAIL
    );

    expect(refreshedMember?.role.slug).toBe('developer');

    const deleteResponse = await page.request.delete(
      `/api/projects/${projectId}/members/${createdMember.id}`
    );
    expect(deleteResponse.ok()).toBeTruthy();

    const membersAfterDeleteResponse = await page.request.get(
      `/api/projects/${projectId}/members`
    );
    expect(membersAfterDeleteResponse.ok()).toBeTruthy();
    const membersAfterDeleteJson = await membersAfterDeleteResponse.json();
    const membersAfterDelete = (
      membersAfterDeleteJson.data ?? membersAfterDeleteJson
    ) as ProjectMemberRecord[];

    expect(
      membersAfterDelete.some((member) => member.user.email === E2E_PROJECT_TEMP_EMAIL)
    ).toBeFalsy();
  });

  test('Admin can create and delete environments through nested environment routes', async ({ page }) => {
    const projectId = getProjectId();
    const slug = `env-${Date.now().toString().slice(-6)}`;
    const name = `E2E Env ${slug}`;

    await page.goto(`/organizations/${ORG_SLUG}/projects/${projectId}`);
    await page.waitForLoadState('load');

    const createResponse = await page.request.post(
      `/api/projects/${projectId}/environments`,
      {
        data: { name, slug },
      }
    );
    expect(createResponse.status()).toBe(201);
    const createJson = await createResponse.json();
    const createdEnvironment = (createJson.data ?? createJson) as {
      id: string;
      slug: string;
    };
    expect(createdEnvironment.slug).toBe(slug);

    const deleteResponse = await page.request.delete(
      `/api/projects/${projectId}/environments/${createdEnvironment.id}`
    );
    expect(deleteResponse.ok()).toBeTruthy();

    const environmentsResponse = await page.request.get(
      `/api/projects/${projectId}/environments`
    );
    expect(environmentsResponse.ok()).toBeTruthy();
    const environmentsJson = await environmentsResponse.json();
    const environments = (environmentsJson.data ?? environmentsJson) as Array<{
      id: string;
      slug: string;
    }>;

    expect(
      environments.some((environment) => environment.id === createdEnvironment.id)
    ).toBeFalsy();
  });
});

test.describe('E2E — Member flows', () => {
  test.use({ storageState: E2E_MEMBER_STORAGE_PATH });

  test('Member login redirects to organizations page', async ({ page }) => {
    // Member is already logged in via storageState
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Should end up at /organizations or redirect to it
    await expect(page.url()).toContain('/organizations');
  });

  test('Member cannot see audit logs sidebar link', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Audit logs link should NOT be visible for members (it's under SECURITY section)
    await expect(
      page.getByRole('link', { name: /audit logs/i })
    ).not.toBeVisible({ timeout: 3000 });
  });

  test('Member can see the project list but not create one', async ({ page }) => {
    await page.goto(`/organizations/${ORG_SLUG}`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Should see the test org heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });

    // Should NOT see "New Project" button
    const newProjectBtn = page
      .getByRole('link', { name: /new project/i })
      .or(page.getByRole('button', { name: /new project/i }));
    await expect(newProjectBtn).not.toBeVisible({ timeout: 3000 });
  });
});
