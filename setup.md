# Setup Guide — Gondor Secret Management

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local dev)

---

## 1. Clean Up

```bash
# Stop and remove containers + volumes (deletes ALL data)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.dev.yml down -v
```

---

## 2. Dev Mode (local app + Docker Postgres)

```bash
# Start Postgres only
docker compose -f docker-compose.dev.yml up -d

# Initialize database
npx prisma db push
npx prisma generate

# Start dev server (port 3002)
npm run dev

# Create first admin
npm run bootstrap -- --email admin@gondor.dev --password "Admin123456!" --name "Admin"
```

App: http://localhost:3002
Prisma Studio: `npx prisma studio`

---

## 3. Docker Production Mode

**Bootstrap credentials via environment variables** (set in `.env` or directly):

```bash
# Set in .env first:
# BOOTSTRAP_EMAIL="admin@gondor.dev"
# BOOTSTRAP_PASSWORD="Admin123456!"
# BOOTSTRAP_NAME="Admin"

# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers — bootstrap admin is created automatically on first startup
docker compose -f docker-compose.prod.yml up -d
```

App: http://localhost:3000
Login: `admin@gondor.dev` / `Admin123456!`

---

## 4. Quick Full Reset (Docker prod)

```bash
# Set bootstrap vars, then reset + rebuild + start (admin auto-created on startup)
BOOTSTRAP_EMAIL="admin@gondor.dev" \
BOOTSTRAP_PASSWORD="Admin123456!" \
BOOTSTRAP_NAME="Admin" \
docker compose -f docker-compose.prod.yml down -v && \
docker compose -f docker-compose.prod.yml build --no-cache && \
docker compose -f docker-compose.prod.yml up -d
```

---

## 5. Prisma Commands

```bash
# Inside Docker container (prod)
docker compose -f docker-compose.prod.yml exec app npx prisma db push
docker compose -f docker-compose.prod.yml exec app npx prisma migrate dev --name <name>
docker compose -f docker-compose.prod.yml exec app npx prisma migrate status
docker compose -f docker-compose.prod.yml exec app npx prisma db push --force-reset
docker compose -f docker-compose.prod.yml exec app npx prisma studio

# Local (dev mode)
npx prisma db push
npx prisma migrate dev --name <name>
npx prisma studio
```

---

## 6. Verify

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check app logs
docker compose -f docker-compose.prod.yml logs app --tail=20

# Check Postgres logs
docker compose -f docker-compose.prod.yml logs postgres --tail=5
```

Login: admin@gondor.dev / Admin123456!

---

## Environment Variables

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secret_manager"
NEXTAUTH_URL="http://localhost:3002"         # dev: 3002, prod Docker: http://localhost:3000
NEXTAUTH_SECRET="same-minimum-32-char-secret"
AUTH_SECRET="same-minimum-32-char-secret"
MASTER_KEY="32-byte-key-openssl-rand-hex-32"
SUPER_MASTER_ADMIN=false
CRON_SECRET="any-secret-string"
```

> **Critical**: `AUTH_SECRET` must equal `NEXTAUTH_SECRET` (NextAuth v5 requirement).

---

## Ports Reference

| Setup | App Port | Postgres |
|-------|----------|----------|
| `npm run dev` (local app) | **3002** | localhost:5432 |
| `docker-compose.dev.yml` | **3002** | localhost:5432 (exposed) |
| `docker-compose.prod.yml` | **3000** | internal only (not exposed) |
