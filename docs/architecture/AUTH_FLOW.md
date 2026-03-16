# Authentication Flow

## Overview

The application uses NextAuth.js for authentication with a credentials provider (email/password).

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginPage
    participant NextAuth
    participant Database
    participant Session

    User->>LoginPage: Enter email/password
    LoginPage->>NextAuth: POST /api/auth/callback/credentials
    NextAuth->>Database: Verify credentials (bcrypt)
    Database-->>NextAuth: User data or null
    NextAuth-->>LoginPage: Session JWT
    LoginPage-->>User: Redirect to dashboard
```

## Session Management

```mermaid
flowchart TB
    subgraph Auth["Authentication"]
        Login[Login Page]
        Register[Register Page]
        NextAuth[NextAuth.js]
        Credentials[Credentials Provider]
        JWT[JWT Token]
    end

    subgraph Validation["Session Validation"]
        Middleware[Middleware]
        APIRoute[API Route]
        AuthLib[Auth Library]
    end

    subgraph Protection["Route Protection"]
        Public[Public Routes]
        Protected[Protected Routes]
        Redirect[Redirect to Login]
    end

    Login --> NextAuth
    Register --> NextAuth
    NextAuth --> Credentials
    Credentials --> JWT
    JWT --> Middleware
    Middleware --> APIRoute
    APIRoute --> AuthLib
    AuthLib --> Protected
    Middleware --> Redirect
    Redirect --> Public
```

## API Authentication

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthLib
    participant Session
    participant Service
    participant DB

    Client->>API: Request with Session Cookie
    API->>AuthLib: requireAuth()
    AuthLib->>Session: Validate JWT
    Session-->>AuthLib: User context
    AuthLib-->>API: Authenticated user
    API->>Service: Business logic
    Service->>DB: Database operations
    DB-->>Service: Results
    Service-->>API: Response
    API-->>Client: JSON Response
```

## Authorization Flow

```mermaid
flowchart TB
    subgraph Check["Authorization Check"]
        Require[requireProjectAccess]
        HasAccess[hasProjectAccess]
        HasPerm[hasPermission]
    end

    subgraph RBAC["RBAC"]
        Role[Get User Role]
        Perms[Get Role Permissions]
        Match[Check Permission]
    end

    subgraph Result["Result"]
        Allow[Allow Access]
        Deny[Deny 403]
    end

    Require --> HasAccess
    HasAccess --> Role
    Role --> Perms
    Perms --> HasPerm
    HasPerm --> Match
    Match --> Allow
    Match --> Deny
```

## Key Files

- `/src/lib/auth.ts` - NextAuth configuration
- `/src/lib/api-auth.ts` - API authentication utilities
- `/src/lib/permissions.ts` - RBAC permission functions
- `/src/components/session-provider.tsx` - Client session context

## Session Structure

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  expires: string;
}
```
