# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secret Management - A Next.js 14 application for managing secrets/environment variables with AES-256-GCM encryption, RBAC, and multi-tenant architecture.

## Commands

```bash
# Development
npm run dev           # Start dev server on port 3002

# Build
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint

# Database (Prisma)
npx prisma migrate dev --name init       # Run migrations
npx prisma generate                       # Generate Prisma client
npx prisma studio                        # Open database GUI
npx prisma db push                       # Push schema changes (prototyping)
```

## Architecture

### Data Model
```
Organization (top-level container)
├── Project (belongs to org)
│   ├── ProjectEnvironment (dev, staging, prod)
│   ├── Folder (hierarchical, nested)
│   │   └── Secret (encrypted with AES-256-GCM)
│   ├── Secret (encrypted)
│   │   └── SecretVersion (history)
│   ├── Role (permissions)
│   ├── ProjectMember
│   └── AuditLog
├── OrgMember (org-level roles: owner, admin, member)
└── Alert (notifications)
```

### Key Files

- **Auth**: `src/lib/auth.ts` - NextAuth configuration
- **Encryption**: `src/lib/encryption.ts` - AES-256-GCM encryption/decryption
- **Database**: `src/lib/db.ts` - Prisma client
- **Services**: `src/backend/services/*.service.ts` - Business logic layer
- **Middleware**: `src/backend/middleware/auth.ts` - Auth & permissions
- **Schemas**: `src/backend/schemas/*.schema.ts` - Zod validation
- **Database**: `prisma/schema.prisma` - Database schema
- **API Routes**: `src/app/api/**/route.ts` - API endpoints

### Folder Structure

```
src/
├── backend/               # Backend layer
│   ├── services/         # Business logic
│   ├── middleware/       # Auth & permissions
│   ├── schemas/         # Zod validation
│   └── utils/          # Utilities
├── app/                  # Next.js App Router
│   ├── api/            # API routes
│   ├── (auth)/         # Auth pages
│   └── (dashboard)/    # Protected pages
├── components/           # React components
│   ├── ui/             # Base UI
│   └── layout/         # Layout components
└── lib/                 # Shared utilities
```

### API Patterns

All API routes follow consistent patterns:
- Use `requireAuth()` from `@backend/middleware/auth` for authentication
- Return `{ success, data, message }` responses using helpers from `@backend/utils/api-response`
- Use Zod schemas for validation in `@backend/schemas`
- Service layer handles business logic in `@backend/services`

### Frontend Structure

```
src/app/
├── (auth)/          # Login, register pages
├── (dashboard)/     # Protected pages
│   ├── organizations/[slug]/
│   │   ├── projects/[projectId]/
│   │   │   ├── secrets/
│   │   │   ├── environments/
│   │   │   ├── members/
│   │   │   └── settings/
│   │   ├── members/
│   │   ├── settings/
│   │   └── alerts/
│   └── alerts/      # Global alerts page
└── api/             # API routes
```

## Database

PostgreSQL with Prisma ORM. Key models:
- User, Organization, Project, ProjectEnvironment
- Folder, Secret, SecretVersion
- Role, ProjectMember, OrgMember
- AuditLog, Alert

## Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=...
ENCRYPTION_KEY=...
```
