# RBAC & Permissions

## Overview

The Secret Manager uses Role-Based Access Control (RBAC) to manage user permissions at both organization and project levels.

## Permission Model

### Two-Level RBAC

```
Organization Level
├── Owner
├── Admin
└── Member
        │
        └── Project Level
            ├── Admin (custom role)
            ├── Editor (custom role)
            └── Viewer (custom role)
```

---

## Organization Roles

### Role Definitions

| Role | Description | Can Delete Org |
|------|-------------|----------------|
| Owner | Full control | Yes |
| Admin | Manage members & projects | No |
| Member | View & create projects | No |

### Organization Permissions Matrix

| Permission | Owner | Admin | Member |
|------------|-------|-------|--------|
| View organization | ✓ | ✓ | ✓ |
| Update organization | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ |
| View members | ✓ | ✓ | ✓ |
| Invite members | ✓ | ✓ | ✗ |
| Update member role | ✓ | ✓ | ✗ |
| Remove members | ✓ | ✓ | ✗ |
| Create projects | ✓ | ✓ | ✓ |
| View all projects | ✓ | ✓ | ✓ |
| Delete projects | ✓ | ✓ | ✗ |

---

## Project Roles

### Default Roles

Every new project comes with three default roles:

| Role | Permissions |
|------|-------------|
| Admin | Full access |
| Editor | Read and write secrets |
| Viewer | Read-only |

### Permission Types

| Permission | Description |
|------------|-------------|
| `secret:read` | View secret keys and values |
| `secret:write` | Create and update secrets |
| `secret:delete` | Delete secrets |
| `secret:export` | Export secrets |
| `environment:manage` | Create, update, delete environments |
| `folder:manage` | Create, update, delete folders |
| `member:manage` | Add and remove project members |
| `role:manage` | Create, update, delete roles |
| `project:settings` | Update project settings |
| `project:delete` | Delete project |

### Project Permissions Matrix

| Permission | Admin | Editor | Viewer |
|------------|-------|--------|--------|
| secret:read | ✓ | ✓ | ✓ |
| secret:write | ✓ | ✓ | ✗ |
| secret:delete | ✓ | ✗ | ✗ |
| secret:export | ✓ | ✓ | ✗ |
| environment:manage | ✓ | ✗ | ✗ |
| folder:manage | ✓ | ✗ | ✗ |
| member:manage | ✓ | ✗ | ✗ |
| role:manage | ✓ | ✗ | ✗ |
| project:settings | ✓ | ✗ | ✗ |
| project:delete | ✓ | ✗ | ✗ |

---

## Custom Roles

### Creating Custom Roles

1. Go to Project → Access Control
2. Click "Create Role"
3. Enter role name (e.g., "DevOps")
4. Enter slug (e.g., "devops")
5. Select permissions
6. Click "Create"

### Role Examples

**DevOps Role:**
```json
{
  "name": "DevOps",
  "permissions": [
    "secret:read",
    "secret:write",
    "secret:export",
    "environment:manage",
    "folder:manage"
  ]
}
```

**QA Tester Role:**
```json
{
  "name": "QA Tester",
  "permissions": [
    "secret:read"
  ]
}
```

---

## Permission Check Flow

```
User Access Request
       │
       ▼
Check Organization Membership
       │
       ├── Not Member → Deny Access
       │
       ▼
Check Project Membership
       │
       ├── Not Member → Deny Access
       │
       ▼
Get User Role
       │
       ▼
Check Required Permission
       │
       ├── Has Permission → Allow Access
       │
       └── No Permission → Deny Access
```

---

## Technical Implementation

### Database Schema

```prisma
model OrgMember {
  id     String @id @default(cuid())
  userId String
  orgId  String
  role   String  // "owner", "admin", "member"
}

model Role {
  id          String   @id @default(cuid())
  name        String
  slug        String
  permissions Json     // ["secret:read", "secret:write"]
  isDefault   Boolean
  projectId   String
}

model ProjectMember {
  id        String @id @default(cuid())
  userId    String
  projectId String
  roleId    String
}
```

### Authorization Middleware

```typescript
// Check if user has permission
async function hasPermission(
  userId: string,
  projectId: string,
  permission: string
): Promise<boolean> {
  const member = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    include: { role: true }
  });

  if (!member) return false;

  const permissions = member.role.permissions as string[];
  return permissions.includes(permission) || permissions.includes('*');
}
```

### Using in API Routes

```typescript
// Example: Require secret:write permission
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return unauthorized();

  const hasPermission = await checkPermission(
    session.user.id,
    projectId,
    'secret:write'
  );

  if (!hasPermission) return forbidden();
  // ... proceed with logic
}
```

---

## Best Practices

### Role Design

1. **Start simple**: Use default roles initially
2. **Principle of least privilege**: Grant minimum permissions needed
3. **Document roles**: Explain what each role can do
4. **Regular review**: Audit roles quarterly

### Security

1. **Limit owners**: 1-2 maximum per organization
2. **Audit access**: Review who has access regularly
3. **Remove inactive users**: Clean up promptly
4. **Use Viewer role**: Give read-only when possible

### Common Patterns

| Team Type | Recommended Roles |
|-----------|------------------|
| Small team (3-5) | Owner + Admin + Viewer |
| Large team | Owner + Admin + Editor + Viewer |
| External contractors | Viewer only |
| Development team | Admin + Editor |
