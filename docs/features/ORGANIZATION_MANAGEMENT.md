# Organization Management

## Overview

Organizations are the top-level container in the Secret Manager system. They group projects and members together, providing a logical boundary for access control and billing.

## Key Concepts

### Organization Structure

```
Organization
├── Members (Owner, Admins, Members)
├── Projects
│   ├── Environments (dev, staging, prod)
│   ├── Folders
│   └── Secrets
└── Settings
```

### Member Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| Owner | Organization owner | Full access, can delete org |
| Admin | Organization admin | Manage members, create/manage projects |
| Member | Regular member | View org, create projects |

## Features

### Create Organization

Users can create unlimited organizations. Each organization requires:

- **Name**: Display name (1-100 characters)
- **Slug**: URL-friendly identifier (unique, alphanumeric with dashes)
- **Avatar**: Optional URL to logo image

**Default Behavior:**

1. Creating an organization automatically makes the creator the **Owner**
2. Three default environments are created: Development, Staging, Production
3. Default roles are created for the project: Admin, Editor, Viewer

---

### Organization Settings

Organization settings include:

- **General**: Name, slug, avatar
- **Members**: View and manage members
- **Billing**: View subscription (future feature)
- **Danger Zone**: Delete organization

### Delete Organization

Deleting an organization is a destructive action that:

1. Requires typing the organization slug to confirm
2. Deletes all projects in the organization
3. Deletes all secrets, environments, folders
4. Removes all member associations
5. Cannot be undone

**Deletion Flow:**

```
Settings → Danger Zone → Type slug → Confirm Delete → Organization Deleted
```

---

### Organization Switcher

The sidebar includes an organization switcher that:

- Shows list of all organizations the user belongs to
- Displays organization avatar and name
- Allows quick switching between organizations
- Shows "Create Organization" option at the bottom

---

## User Experience

### Creating Your First Organization

1. Click "Create Organization" button on organizations page
2. Enter organization name (e.g., "Minas Tirith")
3. Enter unique slug (e.g., "minas-tirith")
4. Optionally add avatar/logo
5. Click "Create"

### Inviting Members

1. Navigate to organization → Members
2. Click "Invite Member"
3. Enter member's email address
4. Select role (Admin or Member)
5. Click "Send Invite"

### Managing Members

- **View Members**: Organization → Members page
- **Change Role**: Click member → Edit role
- **Remove Member**: Click member → Remove button

---

## Technical Implementation

### Database Schema

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
  members   OrgMember[]
  alerts    Alert[]
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/organizations | List organizations |
| POST | /api/organizations | Create organization |
| GET | /api/organizations/[slug] | Get organization |
| PUT | /api/organizations/[slug] | Update organization |
| DELETE | /api/organizations/[slug] | Delete organization |
| GET | /api/organizations/[slug]/members | List members |
| POST | /api/organizations/[slug]/members | Invite member |
| DELETE | /api/organizations/[slug]/members/[id] | Remove member |

### Permissions

```typescript
const orgPermissions = {
  owner: ['*'],
  admin: ['org:read', 'org:update', 'member:invite', 'member:manage', 'project:create', 'project:manage'],
  member: ['org:read', 'project:create']
};
```

---

## Best Practices

### Naming Conventions

- **Organization Name**: Use proper case (e.g., "Minas Tirith", not "MINAS TIRITH")
- **Slug**: Use lowercase, hyphens (e.g., "minas-tirith")
- **Avoid**: Special characters, spaces in slugs

### Member Management

1. **Start with minimum owners**: 1-2 owners maximum
2. **Use admins sparingly**: Only for team leads
3. **Regular audits**: Review members quarterly
4. **Remove inactive members**: Clean up access promptly

### Security

1. **Enable 2FA** (future): Add two-factor authentication
2. **Audit logs**: Review regularly
3. **Least privilege**: Grant minimum required permissions
4. **Delete unused orgs**: Remove organizations no longer needed
