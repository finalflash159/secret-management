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

### Data Fetching
- **React Query** (`@tanstack/react-query`) — All hooks use `useQuery`/`useMutation`
- Hooks: `src/hooks/useOrganization.ts`, `src/hooks/useProjects.ts`, `src/hooks/useSecrets.ts`
- Query Provider: `src/lib/query-provider.tsx`
- Default stale time: 60s, gcTime: 5min

### Security
- **Rate Limiting**: In-memory sliding window at `src/backend/middleware/rate-limit.ts`
  - `loginRateLimiter`: 5 req/min per IP
  - `registerRateLimiter`: 3 req/min per IP
- **Encryption**: AES-256-GCM — `encryptJson`/`decryptJson` for JSON objects
- All sensitive configs (DynamicSecret, Integration) are encrypted at rest

### Performance
- **Database Indexes**: 15 indexes on high-traffic query patterns (see `prisma/schema.prisma`)
- **Secrets Pagination**: List API returns encrypted list by default, decrypt only on detail view

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
│   ├── middleware/       # Auth, permissions, rate limiting
│   ├── schemas/          # Zod validation
│   └── utils/            # Utilities
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── (auth)/           # Auth pages
│   └── (dashboard)/      # Protected pages
├── components/            # React components
│   ├── ui/               # Base UI
│   └── layout/           # Layout components
├── hooks/                 # React hooks (React Query based)
└── lib/                   # Shared utilities
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
- Role, ProjectMember, OrgMember, OrgInvitation
- AuditLog, Alert
- DynamicSecret, DynamicSecretCredential, RotationJob, RotationLog
- Integration, IntegrationSync

**Database Indexes**: 15 indexes on high-traffic queries (Secret, AuditLog, Folder, DynamicSecret, RotationJob, Project, ProjectMember, Role, SecretVersion, InvitationUse, IntegrationSync)

## Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=...
ENCRYPTION_KEY=...
```
