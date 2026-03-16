# Secret API

## Overview

The Secret API provides CRUD operations for secrets. Secrets are encrypted using AES-256-GCM before being stored in the database. Each secret belongs to a project, environment, and optionally a folder.

## Base Endpoint

```
/api/projects/[projectId]/secrets
```

## Endpoints

### List Secrets

Get all secrets for a project, optionally filtered by environment.

**Endpoint:** `GET /api/projects/[id]/secrets`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| envId | string | Filter by environment ID |
| folderId | string | Filter by folder ID |
| limit | number | Number of items (default: 50) |
| offset | number | Items to skip (default: 0) |
| search | string | Search by secret key |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "key": "API_KEY",
      "value": "encrypted-value",
      "folderId": "cuid...",
      "envId": "cuid...",
      "projectId": "cuid...",
      "version": 1,
      "expiresAt": null,
      "metadata": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Note:** Secret values are always encrypted. The API returns the encrypted value.

---

### Create Secret

Create a new secret.

**Endpoint:** `POST /api/projects/[id]/secrets`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  key: string;           // Required, secret name/identifier
  value: string;         // Required, secret value (will be encrypted)
  envId: string;         // Required, environment ID
  folderId?: string;     // Optional, folder ID
  expiresAt?: string;    // Optional, ISO date string
  metadata?: object;     // Optional, JSON object with tags, notes, etc.
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "key": "API_KEY",
    "value": "encrypted-value",
    "envId": "cuid...",
    "folderId": null,
    "projectId": "cuid...",
    "version": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Secret created successfully"
}
```

**Error Responses:**

- 400: Invalid input (validation error)
- 403: Insufficient permissions (need `secret:write`)
- 409: Secret with same key already exists in this environment/folder

---

### Get Secret

Get a single secret by ID.

**Endpoint:** `GET /api/projects/[id]/secrets/[secretId]`

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
    "key": "API_KEY",
    "value": "encrypted-value",
    "folderId": "cuid...",
    "envId": "cuid...",
    "projectId": "cuid...",
    "version": 1,
    "expiresAt": null,
    "metadata": {
      "tags": ["production", "api"]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "versions": [
      {
        "id": "cuid...",
        "version": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "createdBy": {
          "name": "John Doe"
        }
      }
    ]
  }
}
```

---

### Update Secret

Update an existing secret.

**Endpoint:** `PUT /api/projects/[id]/secrets/[secretId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  key?: string;          // Optional, new secret name
  value?: string;        // Optional, new secret value (will be encrypted)
  folderId?: string;     // Optional, new folder ID
  envId?: string;        // Optional, new environment ID
  expiresAt?: string;    // Optional, new expiration date
  metadata?: object;     // Optional, new metadata
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "key": "UPDATED_API_KEY",
    "value": "new-encrypted-value",
    "version": 2,
    "updatedAt": "2024-01-02T00:00:00.000Z"
  },
  "message": "Secret updated successfully"
}
```

**Note:** Updating the value creates a new version. Previous versions are preserved in `SecretVersion`.

---

### Delete Secret

Delete a secret.

**Endpoint:** `DELETE /api/projects/[id]/secrets/[secretId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Secret deleted successfully"
}
```

**Note:** This also deletes all secret versions.

---

### Bulk Operations

Perform bulk operations on secrets.

**Endpoint:** `POST /api/projects/[id]/secrets/bulk`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  operation: "create" | "update" | "delete";
  secrets: Array<{
    key: string;
    value?: string;
    envId: string;
    folderId?: string;
    expiresAt?: string;
    metadata?: object;
  }>;
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 3,
    "deleted": 2
  },
  "message": "Bulk operation completed"
}
```

---

## Secret Versions

### Get Secret Versions

Get version history for a secret.

**Endpoint:** `GET /api/projects/[id]/secrets/[secretId]/versions`

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
      "secretId": "cuid...",
      "value": "encrypted-v2",
      "version": 2,
      "createdBy": {
        "id": "cuid...",
        "name": "John Doe"
      },
      "createdAt": "2024-01-02T00:00:00.000Z"
    },
    {
      "id": "cuid...",
      "secretId": "cuid...",
      "value": "encrypted-v1",
      "version": 1,
      "createdBy": {
        "id": "cuid...",
        "name": "John Doe"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Rollback Secret

Rollback to a previous version.

**Endpoint:** `POST /api/projects/[id]/secrets/[secretId]/rollback`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  version: number;  // Required, version number to rollback to
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "version": 3,
    "updatedAt": "2024-01-03T00:00:00.000Z"
  },
  "message": "Secret rolled back successfully"
}
```

---

## Encryption

### How It Works

1. Secret values are encrypted using AES-256-GCM before storing in the database
2. Encryption key is derived from `NEXTAUTH_SECRET` environment variable
3. Each secret has a unique IV (Initialization Vector) for security
4. The encrypted value includes the IV, so decryption is possible

### Decryption Example

```typescript
import { decrypt } from '@/lib/encryption';

const decrypted = decrypt(encryptedSecretValue);
console.log(decrypted); // "my-secret-value"
```

---

## Folders API

### List Folders

Get all folders in a project/environment.

**Endpoint:** `GET /api/projects/[id]/folders`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| envId | string | Filter by environment ID |
| parentId | string | Filter by parent folder ID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "name": "Database",
      "projectId": "cuid...",
      "envId": "cuid...",
      "parentId": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "cuid...",
      "name": "Credentials",
      "projectId": "cuid...",
      "envId": "cuid...",
      "parentId": "cuid...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create Folder

Create a new folder.

**Endpoint:** `POST /api/projects/[id]/folders`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name: string;      // Required
  envId: string;     // Required, environment ID
  parentId?: string; // Optional, parent folder ID for nesting
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "name": "New Folder",
    "projectId": "cuid...",
    "envId": "cuid...",
    "parentId": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Folder created successfully"
}
```

---

### Update Folder

Update a folder.

**Endpoint:** `PUT /api/projects/[id]/folders/[folderId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  name?: string;     // Optional
  parentId?: string; // Optional, move to different parent
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Folder updated successfully"
}
```

---

### Delete Folder

Delete a folder. All secrets and child folders are also deleted.

**Endpoint:** `DELETE /api/projects/[id]/folders/[folderId]`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

---

## Permissions

| Permission | Description |
|------------|-------------|
| `secret:read` | View secrets |
| `secret:write` | Create and update secrets |
| `secret:delete` | Delete secrets |
| `folder:manage` | Create, update, delete folders |

## Implementation Details

### Files

- Route Handler: `src/app/api/projects/[id]/secrets/route.ts`
- Route Handler: `src/app/api/projects/[id]/secrets/[secretId]/route.ts`
- Route Handler: `src/app/api/projects/[id]/secrets/bulk/route.ts`
- Route Handler: `src/app/api/projects/[id]/folders/route.ts`
- Service: `src/lib/services/secret.service.ts`
- Service: `src/lib/services/folder.service.ts`
- Encryption: `src/lib/encryption.ts`

### Related Database Models

- `Secret`: Secret entity with encrypted value
- `SecretVersion`: Version history
- `Folder`: Folder hierarchy
- `ProjectEnvironment`: Environment containing secrets
