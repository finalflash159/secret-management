# Environment Variables

## Overview

This document describes all environment variables used in the Secret Manager application.

## Required Variables

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |

---

### Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Application URL | `http://localhost:3002` or `https://secrets.yourdomain.com` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Run: `openssl rand -base64 32` |

---

### Encryption

| Variable | Description | Example |
|----------|-------------|---------|
| `ENCRYPTION_KEY` | Key for AES-256-GCM encryption | Run: `openssl rand -hex 32` |

---

## Optional Variables

### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `PORT` | Server port | `3002` |

---

### Invite Codes (Future)

| Variable | Description | Example |
|----------|-------------|---------|
| `INVITE_CODES` | Comma-separated invite codes | `INVITE_CODE_1,INVITE_CODE_2` |

---

## Generating Secrets

### NEXTAUTH_SECRET

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### ENCRYPTION_KEY

```bash
# Using openssl (hex format)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Production Checklist

Before deploying to production, ensure:

- [ ] `NEXTAUTH_SECRET` is set to a strong random value
- [ ] `ENCRYPTION_KEY` is set to a strong random value
- [ ] `DATABASE_URL` points to a production PostgreSQL instance
- [ ] `NEXTAUTH_URL` is set to your production domain
- [ ] `NODE_ENV` is set to `production`

---

## Example Production .env

```env
# Database (Production)
DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/secret_manager"

# Authentication
NEXTAUTH_URL="https://secrets.yourdomain.com"
NEXTAUTH_SECRET="your-secure-random-secret-at-least-32-chars"

# Encryption
ENCRYPTION_KEY="your-64-character-hex-encryption-key"

# Application
NODE_ENV="production"
PORT="3002"
```

---

## Security Notes

1. **Never commit secrets**: Add `.env` to `.gitignore`
2. **Rotate regularly**: Update secrets periodically
3. **Use different secrets**: Don't use same secrets across environments
4. **Monitor access**: Keep your `.env` file secure
5. **Use secrets management**: Consider using AWS Secrets Manager, HashiCorp Vault, or similar for production
