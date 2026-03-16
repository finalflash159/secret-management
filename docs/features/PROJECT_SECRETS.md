# Project & Secrets Management

## Overview

Projects are containers within organizations that hold secrets, organized by environments and folders. This document describes how to effectively manage projects and secrets.

## Project Structure

```
Project
├── Environments
│   ├── Development (dev)
│   ├── Staging (staging)
│   └── Production (prod)
├── Folders
│   ├── Database
│   │   ├── Credentials
│   │   └── Connections
│   └── API Keys
└── Secrets (key-value pairs)
```

## Projects

### Creating a Project

1. Navigate to your organization
2. Click "New Project"
3. Enter project name (e.g., "Backend API")
4. Enter unique slug (e.g., "backend-api")
5. Click "Create"

**Default Setup:**

- Three environments: Development, Staging, Production
- Three roles: Admin, Editor, Viewer

---

### Project Environments

Environments represent different deployment stages:

| Environment | Purpose | Use Case |
|-------------|---------|----------|
| Development | Local/DEV | Development machines |
| Staging | Testing | QA/Pre-production |
| Production | Live | Production servers |

**Best Practices:**

1. **Use consistent naming**: dev, staging, prod
2. **Keep environments minimal**: Only create what's needed
3. **Sync secrets**: Use same keys across environments

---

### Project Members & Roles

Each project has its own role-based access:

| Role | Permissions |
|------|-------------|
| Admin | Full access (read, write, delete, manage members) |
| Editor | Read and write secrets |
| Viewer | Read-only access |

**Adding Members:**

1. Go to Project → Members
2. Click "Add Member"
3. Search by email
4. Select role
5. Click "Add"

---

## Secrets Management

### Creating Secrets

1. Navigate to project
2. Select environment (dev/staging/prod)
3. Click "Add Secret"
4. Enter key (e.g., `DATABASE_URL`)
5. Enter value (encrypted automatically)
6. Optionally add metadata (tags, notes)
7. Click "Save"

---

### Secret Properties

| Property | Description |
|----------|-------------|
| Key | Secret identifier (visible, not encrypted) |
| Value | Secret data (encrypted with AES-256-GCM) |
| Version | Track changes (auto-incremented) |
| Expires | Optional expiration date |
| Metadata | Tags, notes, custom fields |

---

### Version History

Every secret change creates a new version:

- **Version 1**: Initial creation
- **Version 2**: First update
- **Version N**: Nth update

**Viewing History:**

1. Click on secret
2. View "History" tab
3. See all versions with timestamps and who made changes

**Rolling Back:**

1. Open secret details
2. Go to version history
3. Click "Rollback" on desired version
4. Creates new version with old value

---

### Folders

Folders organize secrets hierarchically:

```
Project
├── Database
│   ├── PostgreSQL
│   └── Redis
├── API Keys
│   ├── External Services
│   └── Internal Services
└── Certificates
```

**Creating Folders:**

1. Go to project → Folders
2. Click "New Folder"
3. Select environment
4. Enter folder name
5. Optionally select parent folder
6. Click "Create"

---

### Bulk Operations

For managing multiple secrets:

1. Select multiple secrets (checkbox)
2. Choose action: Move, Delete, Export
3. Confirm action

**Export Secrets:**

1. Select environment and secrets
2. Click "Export"
3. Choose format (.env, JSON, YAML)
4. Download file

---

## Encryption

### How Encryption Works

1. **Encryption Algorithm**: AES-256-GCM
2. **Key Derivation**: From `NEXTAUTH_SECRET`
3. **IV**: Unique per secret for security

```
Plaintext → AES-256-GCM (key + IV) → Encrypted Value
```

### Security Features

- **At Rest**: All secret values encrypted in database
- **In Transit**: HTTPS/TLS for all API calls
- **Key Management**: Encryption key from environment variable

---

## Technical Implementation

### Database Schema

```prisma
model Project {
  id           String   @id @default(cuid())
  name         String
  slug         String
  orgId        String
  ownerId      String
  environments ProjectEnvironment[]
  folders     Folder[]
  secrets     Secret[]
  members     ProjectMember[]
  roles       Role[]
}

model Secret {
  id        String   @id @default(cuid())
  key       String
  value     String   // Encrypted
  folderId  String
  envId     String
  projectId String
  version   Int      @default(1)
  expiresAt DateTime?
  metadata  Json?
}

model Folder {
  id        String   @id @default(cuid())
  name      String
  projectId String
  envId     String
  parentId  String?
  children  Folder[]
  secrets   Secret[]
}
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/projects/[id]/secrets | List secrets |
| POST /api/projects/[id]/secrets | Create secret |
| PUT /api/projects/[id]/secrets/[id] | Update secret |
| DELETE /api/projects/[id]/secrets/[id] | Delete secret |
| GET /api/projects/[id]/environments | List environments |
| GET /api/projects/[id]/folders | List folders |

---

## Best Practices

### Secret Naming

- Use UPPERCASE_SNAKE_CASE (e.g., `API_KEY`, `DATABASE_URL`)
- Be descriptive: `AWS_SECRET_ACCESS_KEY` not `AWS_KEY`
- Prefix related secrets: `STRIPE_`, `AWS_`, `DATABASE_`

### Organization

1. **Use folders**: Group secrets by category
2. **Consistent structure**: Same folder structure across environments
3. **Document secrets**: Use metadata for notes
4. **Set expirations**: Auto-expire temporary secrets

### Security

1. **Rotate regularly**: Use secret rotation feature
2. **Limit access**: Use Viewer role when possible
3. **Audit logs**: Review regularly
4. **Never commit**: Don't commit .env files to git
