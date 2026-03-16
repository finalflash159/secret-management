# Project API

## Overview

The Project API provides CRUD operations for projects, which are containers for secrets, environments, and folders. Projects belong to organizations and can have multiple members with different roles.

## Base Endpoint

```
/api/projects
```

## Endpoints

### Get Project

Get project details by ID.

**Endpoint:** `GET /api/projects/[id]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "My Project",
    "slug": "my-project",
    "orgId": "cuid...",
    "ownerId": "cuid...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "owner": {
      "id": "cuid...",
      "name": "John Doe",
      "email": "user@example.com"
    },
    "_count": {
      "secrets": 20,
      "environments": 3,
      "members": 5
    }
  }
}
```

---

### Update Project

Update project details.

**Endpoint:** `PUT /api/projects/[id]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name?: string;    // Optional, 1-100 characters
  slug?: string;    // Optional, unique within organization
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "Updated Project",
    "slug": "updated-project",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  },
  "message": "Project updated successfully"
}
```

**Error Responses:**

- 403: Insufficient permissions
- 404: Project not found

---

### Delete Project

Delete a project and all its data.

**Endpoint:** `DELETE /api/projects/[id]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**

- 403: Only owners and admins can delete
- 404: Project not found

---

## Project Environments

### List Environments

Get all environments in a project.

**Endpoint:** `GET /api/projects/[id]/environments`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "name": "Development",
      "slug": "dev",
      "projectId": "cuid...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "cuid...",
      "name": "Production",
      "slug": "prod",
      "projectId": "cuid...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create Environment

Create a new environment.

**Endpoint:** `POST /api/projects/[id]/environments`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name: string;    // Required, e.g., "Development", "Staging", "Production"
  slug: string;    // Required, e.g., "dev", "staging", "prod"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "Staging",
    "slug": "staging",
    "projectId": "cuid...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Environment created successfully"
}
```

---

### Update Environment

Update an environment.

**Endpoint:** `PUT /api/projects/[id]/environments/[envId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name?: string;    // Optional
  slug?: string;    // Optional
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Environment updated successfully"
}
```

---

### Delete Environment

Delete an environment and all secrets within it.

**Endpoint:** `DELETE /api/projects/[id]/environments/[envId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Environment deleted successfully"
}
```

---

## Project Members

### List Members

Get all members of a project.

**Endpoint:** `GET /api/projects/[id]/members`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "user": {
        "id": "cuid...",
        "name": "John Doe",
        "email": "user@example.com"
      },
      "role": {
        "id": "cuid...",
        "name": "Admin",
        "slug": "admin",
        "permissions": ["secret:read", "secret:write", "member:manage"]
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Add Member

Add a member to the project.

**Endpoint:** `POST /api/projects/[id]/members`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  email: string;    // Required, user's email
  roleId: string;   // Required, role ID to assign
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "userId": "cuid...",
    "projectId": "cuid...",
    "roleId": "cuid...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Member added successfully"
}
```

---

### Update Member

Update a member's role.

**Endpoint:** `PATCH /api/projects/[id]/members/[memberId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  roleId: string;  // Required, new role ID
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Member updated successfully"
}
```

---

### Remove Member

Remove a member from the project.

**Endpoint:** `DELETE /api/projects/[id]/members/[memberId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

## Project Roles

### List Roles

Get all roles in a project.

**Endpoint:** `GET /api/projects/[id]/roles`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "name": "Admin",
      "slug": "admin",
      "permissions": ["secret:read", "secret:write", "secret:delete", "member:manage"],
      "isDefault": false,
      "projectId": "cuid..."
    },
    {
      "id": "cuid...",
      "name": "Viewer",
      "slug": "viewer",
      "permissions": ["secret:read"],
      "isDefault": true,
      "projectId": "cuid..."
    }
  ]
}
```

---

### Create Role

Create a new role.

**Endpoint:** `POST /api/projects/[id]/roles`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name: string;              // Required
  slug: string;              // Required, unique within project
  permissions: string[];     // Required, array of permission strings
  isDefault?: boolean;       // Optional, default: false
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "Editor",
    "slug": "editor",
    "permissions": ["secret:read", "secret:write"],
    "isDefault": false,
    "projectId": "cuid..."
  },
  "message": "Role created successfully"
}
```

---

### Update Role

Update a role.

**Endpoint:** `PUT /api/projects/[id]/roles/[roleId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name?: string;           // Optional
  permissions?: string[]; // Optional
  isDefault?: boolean;    // Optional
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Role updated successfully"
}
```

---

### Delete Role

Delete a role.

**Endpoint:** `DELETE /api/projects/[id]/roles/[roleId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

## Audit Logs

### List Audit Logs

Get audit logs for a project.

**Endpoint:** `GET /api/projects/[id]/audit-logs`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of items (default: 50) |
| offset | number | Items to skip (default: 0) |
| action | string | Filter by action |
| userId | string | Filter by user |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cuid...",
        "projectId": "cuid...",
        "userId": "cuid...",
        "user": {
          "name": "John Doe",
          "email": "user@example.com"
        },
        "action": "created",
        "targetType": "secret",
        "targetId": "cuid...",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Permissions

Available permissions for roles:

| Permission | Description |
|------------|-------------|
| `secret:read` | View secrets |
| `secret:write` | Create and update secrets |
| `secret:delete` | Delete secrets |
| `secret:export` | Export secrets |
| `environment:manage` | Manage environments |
| `folder:manage` | Manage folders |
| `member:manage` | Manage project members |
| `role:manage` | Manage roles |
| `project:settings` | Update project settings |
| `project:delete` | Delete project |

## Implementation Details

### Files

- Route Handler: `src/app/api/projects/[id]/route.ts`
- Route Handler: `src/app/api/projects/[id]/environments/route.ts`
- Route Handler: `src/app/api/projects/[id]/members/route.ts`
- Route Handler: `src/app/api/projects/[id]/roles/route.ts`
- Route Handler: `src/app/api/projects/[id]/audit-logs/route.ts`
- Service: `src/lib/services/project.service.ts`
- Service: `src/lib/services/environment.service.ts`
- Service: `src/lib/services/member.service.ts`

### Related Database Models

- `Project`: Project entity
- `ProjectEnvironment`: Project environments
- `ProjectMember`: Project membership with roles
- `Role`: Role with permissions
- `AuditLog`: Activity logs
