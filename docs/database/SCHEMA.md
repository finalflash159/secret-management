# Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ OrgMember : "org memberships"
    User ||--o{ ProjectMember : "project memberships"
    User ||--o{ Project : "owned projects"
    User ||--o{ AuditLog : "created logs"
    User ||--o{ Secret : "created secrets"
    User ||--o{ Alert : "alerts"

    Organization ||--o{ Project : "contains"
    Organization ||--o{ OrgMember : "has members"
    Organization ||--o{ Alert : "has alerts"

    Project ||--o{ ProjectEnvironment : "has environments"
    Project ||--o{ Folder : "has folders"
    Project ||--o{ Secret : "contains"
    Project ||--o{ ProjectMember : "has members"
    Project ||--o{ Role : "has roles"
    Project ||--o{ AuditLog : "has logs"
    Project ||--o{ Alert : "has alerts"

    ProjectEnvironment ||--o{ Folder : "has folders"
    ProjectEnvironment ||--o{ Secret : "contains secrets"

    Folder ||--o{ Secret : "contains"
    Folder ||--o{ Folder : "parent-child"

    Secret ||--o{ SecretVersion : "has versions"

    Role ||--o{ ProjectMember : "assigned to"

    User {
        string id PK
        string email UK
        string password
        string name
        datetime createdAt
        datetime updatedAt
    }

    Organization {
        string id PK
        string name
        string slug UK
        string avatar
        datetime createdAt
        datetime updatedAt
    }

    Project {
        string id PK
        string name
        string slug
        string orgId FK
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    ProjectEnvironment {
        string id PK
        string name
        string slug
        string projectId FK
        datetime createdAt
    }

    Folder {
        string id PK
        string name
        string projectId FK
        string envId FK
        string parentId FK
        datetime createdAt
        datetime updatedAt
    }

    Secret {
        string id PK
        string key
        string value
        string folderId FK
        string envId FK
        string projectId FK
        string createdBy FK
        string updatedBy FK
        int version
        datetime expiresAt
        json metadata
        datetime createdAt
        datetime updatedAt
    }

    SecretVersion {
        string id PK
        string secretId FK
        string value
        int version
        string createdBy FK
        datetime createdAt
    }

    AuditLog {
        string id PK
        string projectId FK
        string userId FK
        string action
        string targetType
        string targetId
        json metadata
        string ipAddress
        string userAgent
        datetime createdAt
    }

    ProjectMember {
        string id PK
        string userId FK
        string projectId FK
        string roleId FK
        datetime createdAt
    }

    Role {
        string id PK
        string name
        string slug
        json permissions
        bool isDefault
        string projectId FK
    }

    OrgMember {
        string id PK
        string userId FK
        string orgId FK
        string role
        datetime createdAt
    }

    Alert {
        string id PK
        string userId FK
        string orgId FK
        string projectId FK
        string type
        string title
        string message
        string link
        bool read
        datetime readAt
        json metadata
        datetime createdAt
    }
```

## Models

### User
- System user account
- Unique email address
- Password hashed with bcrypt

### Organization
- Top-level container for projects
- Has members with roles (owner, admin, member)
- Unique slug for URL routing

### Project
- Belongs to one organization
- Has one owner and multiple members
- Contains environments, folders, secrets
- Unique slug per organization

### ProjectEnvironment
- Represents deployment environments (dev, staging, prod)
- Belongs to a project
- Unique slug per project

### Folder
- Hierarchical organization of secrets
- Can be nested (parent-child)
- Belongs to project and environment

### Secret
- Actual secret key-value pairs
- Encrypted with AES-256-GCM
- Versioned for change tracking
- Belongs to project, environment, folder

### SecretVersion
- History of secret value changes
- Tracks who changed what and when

### Role
- Project-level permissions
- JSON array of permission strings
- Assigned to project members

### ProjectMember
- Links users to projects with roles
- One role per user per project

### OrgMember
- Links users to organizations
- Role at org level (owner, admin, member)

### AuditLog
- Tracks all actions in projects
- Includes IP address and user agent

### Alert
- User notifications
- Can be at user, org, or project level
- Types: info, warning, error, success, etc.

## Migration Strategy

This project uses Prisma with the following migration approach:

```bash
# Create a migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Push schema changes (prototyping)
npx prisma db push
```

### Key Points

1. **Prisma Migrate** is used for schema changes
2. **Cascade deletes** are configured for related data
3. **Unique constraints** prevent duplicate entries
4. **Indexes** are added for frequently queried fields

### Running Migrations

```bash
# Development
npm run dev
# Prisma automatically applies migrations on startup

# Create new migration
npx prisma migrate dev --name add_new_field

# Production deployment
npx prisma migrate deploy
```
