# Gondor - Secret Management

A modern, secure secret management application for teams and organizations. Store, organize, and manage your sensitive credentials with enterprise-grade encryption.

![Gondor Secret Management](./docs/images/Gondor-previewpng.png)

## Features

### Organization & Project Management
- Create and manage multiple organizations
- Organize projects within organizations
- Team collaboration with role-based access control

### Secret Management
- **AES-256-GCM Encryption**: All secrets are encrypted at rest
- **Version History**: Track changes with full version history
- **Multi-Environment**: Support for dev, staging, production environments
- **Folder Organization**: Hierarchical folder structure for secrets
- **Import/Export**: Import from .env files, export to multiple formats

### Security
- **Role-Based Access Control (RBAC)**: Granular permissions at org and project level
- **Audit Logging**: Complete activity history
- **Secret Expiry**: Set expiration dates for sensitive credentials
- **Organization Isolation**: Complete data separation between organizations

### Notifications
- **Alert System**: Stay informed about important events
- **Secret Expiry Alerts**: Get notified before secrets expire
- **Security Alerts**: Monitor for security concerns

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Encryption**: AES-256-GCM

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone https://github.com/finalflash159/gondor.git
cd gondor

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Initialize database
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Visit [http://localhost:3002](http://localhost:3002) to start.

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
ENCRYPTION_KEY="your-32-byte-encryption-key"
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Protected dashboard pages
│   └── api/           # API routes
├── components/         # React components
├── lib/                # Core libraries
│   ├── services/      # Business logic
│   ├── schemas/       # Zod validation
│   ├── auth.ts        # NextAuth config
│   ├── encryption.ts  # AES-256-GCM
│   └── permissions.ts # RBAC
└── types/              # TypeScript types
```

## Documentation

See the [docs](./docs) directory for detailed documentation:

- [Architecture](./docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Database Schema](./docs/database/SCHEMA.md)
- [API Reference](./docs/api/API_OVERVIEW.md)
- [Setup Guide](./docs/setup/LOCAL_SETUP.md)

## License

MIT
