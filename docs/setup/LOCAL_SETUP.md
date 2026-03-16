# Local Setup Guide

## Prerequisites

Before starting, ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| PostgreSQL | 14+ | Local or Docker |
| npm | 9+ | Comes with Node.js |

---

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd secret-management
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:

```bash
createdb secret_manager
```

3. Update `.env` with your database URL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/secret_manager"
```

### Option B: Docker PostgreSQL

1. Start PostgreSQL container:

```bash
docker run -d \
  --name secret-manager-db \
  -e POSTGRES_DB=secret_manager \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14
```

2. Set database URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secret_manager"
```

---

## Step 4: Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secret_manager"

# NextAuth
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-secret-key-min-32-characters-long"

# Encryption (for AES-256-GCM)
ENCRYPTION_KEY="your-32-byte-encryption-key-here"
```

**Generating Secrets:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

---

## Step 5: Initialize Database

Run Prisma migrations to create tables:

```bash
npx prisma migrate dev --name init
```

This will create all the database tables based on the schema.

---

## Step 6: Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3002`

---

## Step 7: Create First User

1. Navigate to `http://localhost:3002/register`
2. Fill in the registration form:
   - Email
   - Password (min 8 characters)
   - Name (optional)
3. Click "Create Account"

---

## Step 8: Create Organization

1. After login, click "Create Organization"
2. Enter organization name (e.g., "My Team")
3. Enter unique slug (e.g., "my-team")
4. Click "Create"

---

## Verification

### Check Database Tables

```bash
npx prisma studio
```

This opens Prisma Studio to view your data.

### Test API

```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

## Common Issues

### "Database connection refused"

- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify PostgreSQL accepts connections

### "NextAuth_SECRET error"

- Ensure NEXTAUTH_SECRET is set
- Must be at least 32 characters

### "Prisma schema out of sync"

```bash
npx prisma migrate dev
```

---

## Additional Commands

```bash
# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Push schema changes (prototyping)
npx prisma db push
```

---

## Next Steps

- Review [Environment Variables](./ENVIRONMENT.md) for production settings
- Set up [API Documentation](../api/API_OVERVIEW.md)
- Configure authentication for production
