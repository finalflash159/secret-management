# Audit Logging

## Overview

Audit logging tracks all actions performed within projects, providing a complete history of who did what and when. This is essential for security compliance, troubleshooting, and accountability.

## What Gets Logged

### Actions

| Action | Description |
|--------|-------------|
| `created` | New entity created |
| `updated` | Entity modified |
| `deleted` | Entity removed |
| `viewed` | Entity was viewed |
| `exported` | Secrets were exported |
| `imported` | Secrets were imported |
| `rolled_back` | Secret rolled back to previous version |

### Target Types

| Target Type | Description |
|-------------|-------------|
| `secret` | Secret created/updated/deleted |
| `folder` | Folder created/updated/deleted |
| `project` | Project settings changed |
| `member` | Member added/removed/updated |
| `role` | Role created/updated/deleted |
| `environment` | Environment created/updated/deleted |

---

## Audit Log Data

### Log Entry Structure

```json
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
  "metadata": {
    "key": "DATABASE_URL",
    "env": "production"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Metadata Examples

**Secret Created:**
```json
{
  "action": "created",
  "targetType": "secret",
  "metadata": {
    "key": "API_KEY",
    "envId": "env-cuid",
    "envSlug": "prod",
    "folderId": "folder-cuid"
  }
}
```

**Secret Updated:**
```json
{
  "action": "updated",
  "targetType": "secret",
  "metadata": {
    "key": "API_KEY",
    "changes": ["value"],
    "version": 2
  }
}
```

**Member Added:**
```json
{
  "action": "created",
  "targetType": "member",
  "metadata": {
    "memberEmail": "newuser@example.com",
    "role": "editor"
  }
}
```

---

## Viewing Audit Logs

### Accessing Logs

1. Navigate to Project → Settings → Audit Logs
2. View chronological list of actions
3. Filter by date, user, action type

### Filtering

| Filter | Description |
|--------|-------------|
| Date Range | Filter by time period |
| User | Filter by who performed action |
| Action | Filter by action type |
| Target | Filter by target type |

---

## Use Cases

### Security Compliance

- Track who accessed sensitive production secrets
- Identify unauthorized access attempts
- Meet SOC 2, HIPAA, PCI-DSS requirements

### Troubleshooting

- Identify when configuration changed
- Track down misconfigured secrets
- Understand deployment issues

### Accountability

- Know who deleted a secret
- Track manual overrides
- Audit team activities

---

## Technical Implementation

### Database Schema

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  projectId  String
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  action     String   // created, updated, deleted, viewed, exported
  targetType String   // secret, folder, project, member
  targetId   String
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([projectId, createdAt])
}
```

### API Endpoint

```
GET /api/projects/[id]/audit-logs
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of items (default: 50) |
| offset | number | Items to skip (default: 0) |
| action | string | Filter by action |
| userId | string | Filter by user |

### Logging Service

```typescript
import { auditService } from '@/lib/services';

// Log an action
await auditService.log({
  projectId: 'project-cuid',
  userId: 'user-cuid',
  action: 'created',
  targetType: 'secret',
  targetId: 'secret-cuid',
  metadata: { key: 'API_KEY' },
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent')
});
```

---

## Retention

### Default Policy

- **Retention Period**: 90 days (configurable)
- **Auto-cleanup**: Old logs deleted automatically

### Configuration

Set in environment variables:

```bash
AUDIT_LOG_RETENTION_DAYS=90
```

---

## Best Practices

### Security

1. **Review regularly**: Check logs weekly
2. **Set alerts**: Notify on sensitive actions
3. **Export archives**: Keep long-term records
4. **Monitor access**: Track who views production secrets

### Compliance

1. **Document policies**: Explain what gets logged
2. **Regular audits**: Schedule periodic reviews
3. **Maintain chain**: Keep log integrity
4. **Access control**: Limit who can view logs
