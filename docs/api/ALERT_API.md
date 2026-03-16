# Alert API

## Overview

The Alert API provides CRUD operations for user notifications and alerts. Alerts can be related to organizations, projects, or be global. They notify users about important events like secret expiry, security issues, member changes, etc.

## Base Endpoint

```
/api/alerts
```

## Endpoints

### List Alerts

Get all alerts for the authenticated user.

**Endpoint:** `GET /api/alerts`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| orgId | string | Filter by organization |
| projectId | string | Filter by project |
| type | string | Filter by alert type |
| read | boolean | Filter by read status |
| limit | number | Number of items (default: 50) |
| offset | number | Items to skip (default: 0) |

**Alert Types:**

| Type | Description |
|------|-------------|
| `info` | General information |
| `warning` | Warnings |
| `error` | Errors |
| `success` | Success messages |
| `secret_expiry` | Secret expiring soon |
| `secret_expired` | Secret expired |
| `security` | Security alerts |
| `member_added` | New member added |
| `member_removed` | Member removed |
| `access_granted` | Access granted |
| `access_revoked` | Access revoked |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "cuid...",
        "userId": "cuid...",
        "orgId": "cuid...",
        "org": {
          "name": "My Organization",
          "slug": "my-organization"
        },
        "projectId": null,
        "project": null,
        "type": "info",
        "title": "Welcome",
        "message": "Welcome to Secret Manager",
        "link": "/organizations/my-organization",
        "read": false,
        "readAt": null,
        "metadata": null,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Delete Alert

Delete a single alert.

**Endpoint:** `DELETE /api/alerts?id={alertId}`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "deleted": 1
  },
  "message": "Alert deleted successfully"
}
```

---

### Cleanup Old Alerts

Delete all read alerts older than 30 days.

**Endpoint:** `DELETE /api/alerts`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "cleanedUp": 5
  },
  "message": "Old alerts cleaned up successfully"
}
```

---

## Alert Structure

### Alert Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| userId | string | Owner of the alert |
| orgId | string? | Related organization |
| projectId | string? | Related project |
| type | AlertType | Alert category |
| title | string | Alert title |
| message | string | Alert message |
| link | string? | Optional link to related entity |
| read | boolean | Read status |
| readAt | DateTime? | When alert was read |
| metadata | JSON? | Additional data |
| createdAt | DateTime | Creation timestamp |

---

## Creating Alerts (Internal)

Alerts are typically created by the system or other services. Here's how to create alerts programmatically:

### Using Alert Service

```typescript
import { alertService } from '@/lib/services';

// Create alert for user
await alertService.create({
  userId: 'user-cuid',
  orgId: 'org-cuid',
  projectId: null,
  type: 'info',
  title: 'New Feature',
  message: 'Check out our new secret rotation feature!',
  link: '/organizations/my-org/secret-rotation',
});
```

### Alert Trigger Events

| Event | Alert Type | Recipients |
|-------|------------|------------|
| Secret expiring in 7 days | `secret_expiry` | Secret creator, project members |
| Secret expired | `secret_expired` | Secret creator, project members |
| Member added to org | `member_added` | New member, org owners |
| Member removed from org | `member_removed` | Affected member, org owners |
| Member added to project | `member_added` | New member |
| Access granted | `access_granted` | User who received access |
| Access revoked | `access_revoked` | User who lost access |
| Security concern | `security` | Project members |

---

## Frontend Integration

### Using Alert Hook

```tsx
import { useAlerts } from '@/hooks/use-alerts';

function AlertsPage() {
  const { alerts, isLoading, markAsRead, deleteAlert } = useAlerts();

  if (isLoading) return <Loading />;

  return (
    <div>
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onRead={() => markAsRead(alert.id)}
          onDelete={() => deleteAlert(alert.id)}
        />
      ))}
    </div>
  );
}
```

### Global Alerts Page

The application provides a global alerts page accessible from the header:

```
/alerts
```

This page shows alerts from all organizations without requiring organization selection.

---

## Permissions

Alerts are user-specific. Users can only view and manage their own alerts.

| Action | Permission |
|--------|------------|
| List alerts | Authenticated user |
| Delete own alert | Owner only |
| Cleanup old alerts | Authenticated user |

---

## Implementation Details

### Files

- Route Handler: `src/app/api/alerts/route.ts`
- Service: `src/lib/services/alert.service.ts`
- Hook: `src/hooks/use-alerts.ts`
- Page: `src/app/(dashboard)/alerts/page.tsx`

### Related Database Models

- `Alert`: Alert entity with type, read status, and metadata
- `User`: Owner of alerts
- `Organization`: Related organization (optional)
- `Project`: Related project (optional)

### Dependencies

- `AlertType` enum in Prisma schema defines all alert types

---

## Best Practices

1. **Link Alerts**: Always provide a `link` when possible to help users navigate to the relevant content
2. **Set Expiry Metadata**: For secret expiry alerts, include the secret name and expiry date in metadata
3. **Group Similar Alerts**: Consider batching multiple similar alerts into one
4. **Auto-Cleanup**: Use the cleanup endpoint regularly to remove old read alerts
5. **Mark as Read**: Mark alerts as read when user clicks on them or navigates via the link
