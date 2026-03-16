# Gondor - Secret Management System

A production-grade multi-tenant secret management system built with Next.js 14, PostgreSQL, and Prisma.

## Overview

Gondor is a SaaS application for managing sensitive configuration data (API keys, database credentials, tokens) across multiple organizations and projects. It provides secure encryption, role-based access control, and comprehensive audit logging.

## Key Features

- Multi-tenant architecture with Organization/Project hierarchy
- AES-256-GCM encryption for all secrets
- Environment isolation (Development, Staging, Production)
- Folder-based secret organization
- Role-Based Access Control (RBAC) at project level
- Comprehensive audit logging
- Alert/Notification system
- Import/Export support (.env, JSON, YAML)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **Encryption**: AES-256-GCM

## Quick Links

- [System Architecture](./architecture/SYSTEM_ARCHITECTURE.md)
- [Database Schema](./database/SCHEMA.md)
- [API Documentation](./api/API_OVERVIEW.md)
- [Feature Documentation](./features/PROJECT_SECRETS.md)
- [Setup Guide](./setup/LOCAL_SETUP.md)
