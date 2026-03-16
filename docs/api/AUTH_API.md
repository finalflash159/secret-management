# Authentication API

## Overview

The Authentication API handles user registration, login, logout, and session management using NextAuth.js with JWT credentials provider.

## Base Endpoint

```
/api/auth
```

## Endpoints

### Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```typescript
{
  email: string;        // Required, valid email format
  password: string;     // Required, min 8 characters
  name?: string;        // Optional
  inviteCode?: string;  // Optional, required if invites enabled
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token..."
  },
  "message": "User registered successfully"
}
```

**Error Responses:**

- 400: Invalid input (validation error)
- 409: Email already exists

---

### Login

Authenticate user and get JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```typescript
{
  email: string;    // Required
  password: string; // Required
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token..."
  },
  "message": "Login successful"
}
```

**Error Responses:**

- 401: Invalid credentials
- 400: Missing email or password

---

### Logout

End user session.

**Endpoint:** `POST /api/auth/logout`

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Current User

Retrieve authenticated user information.

**Endpoint:** `GET /api/auth/me`

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
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- 401: Not authenticated

---

## Security

### Password Requirements

- Minimum 8 characters
- Stored using bcrypt with cost factor 12

### Token Security

- JWT tokens expire in 7 days
- Tokens are signed with `NEXTAUTH_SECRET`
- Store tokens securely (httpOnly cookies recommended)

### Rate Limiting

Currently not implemented. Add in production to prevent brute force attacks.

## Implementation Details

### Files

- Route Handler: `src/app/api/auth/register/route.ts`
- Route Handler: `src/app/api/auth/login/route.ts`
- Auth Configuration: `src/lib/auth.ts`
- Session Provider: `src/components/providers/session-provider.tsx`

### Dependencies

- `next-auth`: Authentication framework
- `bcryptjs`: Password hashing
- `zod`: Request validation

## Example Usage

### Register with cURL

```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

### Login with cURL

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Authenticated Request

```bash
curl -X GET http://localhost:3002/api/organizations \
  -H "Authorization: Bearer <your-token>"
```
