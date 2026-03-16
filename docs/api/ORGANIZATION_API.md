# Organization API

## Overview

The Organization API provides CRUD operations for organizations, which are top-level containers for projects. Each organization can have multiple members with different roles (owner, admin, member).

## Base Endpoint

```
/api/organizations
```

## Endpoints

### List Organizations

Get all organizations the authenticated user is a member of.

**Endpoint:** `GET /api/organizations`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of items (default: 50) |
| offset | number | Items to skip (default: 0) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "name": "My Organization",
      "slug": "my-organization",
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "projects": 5,
        "members": 10
      }
    }
  ]
}
```

---

### Create Organization

Create a new organization.

**Endpoint:** `POST /api/organizations`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name: string;        // Required, 1-100 characters
  slug: string;       // Required, unique, alphanumeric with dashes
  avatar?: string;     // Optional, URL to avatar image
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "My Organization",
    "slug": "my-organization",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Organization created successfully"
}
```

**Error Responses:**

- 400: Invalid input (validation error)
- 409: Slug already exists

---

### Get Organization

Get organization details by slug.

**Endpoint:** `GET /api/organizations/[slug]`

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
    "name": "My Organization",
    "slug": "my-organization",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "owner": {
      "id": "cuid...",
      "name": "John Doe",
      "email": "user@example.com"
    },
    "_count": {
      "projects": 5,
      "members": 10
    }
  }
}
```

**Error Responses:**

- 403: User not a member of organization
- 404: Organization not found

---

### Update Organization

Update organization details. Only owners can update.

**Endpoint:** `PUT /api/organizations/[slug]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name?: string;      // Optional, 1-100 characters
  avatar?: string;    // Optional, URL to avatar image
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "Updated Name",
    "slug": "my-organization",
    "avatar": "https://...",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  },
  "message": "Organization updated successfully"
}
```

**Error Responses:**

- 403: Only owners can update organization
- 404: Organization not found

---

### Delete Organization

Delete an organization and all its data (projects, secrets, etc.).

**Endpoint:** `DELETE /api/organizations/[slug]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  deleteConfirmText: string;  // Must match organization slug
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

**Error Responses:**

- 400: Confirmation text doesn't match slug
- 403: Only owners can delete organization
- 404: Organization not found

---

## Organization Members

### List Members

Get all members of an organization.

**Endpoint:** `GET /api/organizations/[slug]/members`

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
      "role": "owner",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Invite Member

Invite a new member to the organization.

**Endpoint:** `POST /api/organizations/[slug]/members`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  email: string;    // Required, email of user to invite
  role: string;     // Required, one of: "admin", "member"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "userId": "cuid...",
    "orgId": "cuid...",
    "role": "member",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Member invited successfully"
}
```

**Error Responses:**

- 400: User already a member
- 403: Only owners and admins can invite members

---

### Update Member

Update a member's role.

**Endpoint:** `PATCH /api/organizations/[slug]/members/[memberId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  role: string;  // Required, one of: "admin", "member"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Member role updated successfully"
}
```

---

### Remove Member

Remove a member from the organization.

**Endpoint:** `DELETE /api/organizations/[slug]/members/[memberId]`

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

## Organization Projects

### List Projects

Get all projects in an organization.

**Endpoint:** `GET /api/organizations/[slug]/projects`

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
      "name": "My Project",
      "slug": "my-project",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "secrets": 20,
        "members": 3
      }
    }
  ]
}
```

---

### Create Project

Create a new project in the organization.

**Endpoint:** `POST /api/organizations/[slug]/projects`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name: string;    // Required, 1-100 characters
  slug: string;    // Required, unique within organization
}
```

**Response (201 Created):**

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
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Project created successfully"
}
```

---

## Authorization Rules

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View organization | ✓ | ✓ | ✓ |
| Update organization | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ |
| View members | ✓ | ✓ | ✓ |
| Invite members | ✓ | ✓ | ✗ |
| Update member role | ✓ | ✓ | ✗ |
| Remove members | ✓ | ✓ | ✗ |
| Create projects | ✓ | ✓ | ✓ |
| View projects | ✓ | ✓ | ✓ |
| Delete projects | ✓ | ✓ | ✗ |

## Implementation Details

### Files

- Route Handler: `src/app/api/organizations/route.ts`
- Route Handler: `src/app/api/organizations/[slug]/route.ts`
- Route Handler: `src/app/api/organizations/[slug]/members/route.ts`
- Service: `src/lib/services/organization.service.ts`
- Schema: `src/lib/schemas/organization.schema.ts`

### Related Database Models

- `Organization`: Organization entity
- `OrgMember`: Organization membership with roles
- `Project`: Projects belonging to organization
