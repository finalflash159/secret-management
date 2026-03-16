# API Overview

## Base URL

```
http://localhost:3002/api
```

## Authentication

All API endpoints (except authentication routes) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

All responses follow a consistent structure:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 500 | Internal Server Error |

## API Endpoints Summary

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user |

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/organizations | List user's organizations |
| POST | /api/organizations | Create organization |
| GET | /api/organizations/[slug] | Get organization details |
| PUT | /api/organizations/[slug] | Update organization |
| DELETE | /api/organizations/[slug] | Delete organization |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/organizations/[slug]/projects | List projects |
| POST | /api/organizations/[slug]/projects | Create project |
| GET | /api/projects/[id] | Get project details |
| PUT | /api/projects/[id] | Update project |
| DELETE | /api/projects/[id] | Delete project |

### Secrets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/[id]/secrets | List secrets |
| POST | /api/projects/[id]/secrets | Create secret |
| GET | /api/projects/[id]/secrets/[secretId] | Get secret |
| PUT | /api/projects/[id]/secrets/[secretId] | Update secret |
| DELETE | /api/projects/[id]/secrets/[secretId] | Delete secret |
| POST | /api/projects/[id]/secrets/bulk | Bulk operations |

### Environments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/[id]/environments | List environments |
| POST | /api/projects/[id]/environments | Create environment |
| PUT | /api/projects/[id]/environments/[envId] | Update environment |
| DELETE | /api/projects/[id]/environments/[envId] | Delete environment |

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/[id]/folders | List folders |
| POST | /api/projects/[id]/folders | Create folder |
| PUT | /api/projects/[id]/folders/[folderId] | Update folder |
| DELETE | /api/projects/[id]/folders/[folderId] | Delete folder |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/organizations/[slug]/members | List org members |
| POST | /api/organizations/[slug]/members | Invite member |
| PUT | /api/organizations/[slug]/members/[memberId] | Update member |
| DELETE | /api/organizations/[slug]/members/[memberId] | Remove member |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/[id]/roles | List roles |
| POST | /api/projects/[id]/roles | Create role |
| PUT | /api/projects/[id]/roles/[roleId] | Update role |
| DELETE | /api/projects/[id]/roles/[roleId] | Delete role |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/[id]/audit-logs | List audit logs |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | List user alerts |
| DELETE | /api/alerts | Delete alert(s) |

## Query Parameters

Common query parameters across list endpoints:

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of items to return (default: 50) |
| offset | number | Number of items to skip (default: 0) |
| search | string | Search term for filtering |
| sortBy | string | Field to sort by |
| sortOrder | string | Sort order (asc/desc) |

## Rate Limiting

Currently no rate limiting is implemented. This should be added in production.

## Versioning

The API uses URL-based versioning. Current version is v1:

```
/api/v1/...
```

Note: The current implementation does not include version in URL. This will be added in future updates.
