# Use Node.js 20 LTS
FROM node:20-alpine AS base

# [FIX]: Add openssl to resolve Prisma libssl.so.1.1 missing error on Alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLIENT_ENGINE_TYPE=library

# Generate Prisma Client
RUN npx prisma generate
# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy Prisma client and engine files (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# Copy Prisma CLI package (symlinked by .bin/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
# Copy node_modules/.bin (contains prisma CLI symlinks)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
# Copy Prisma schema (needed for seed command)
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma

# [FIX]: Use mkdir -p to prevent "No such file or directory" error and set correct permissions
RUN mkdir -p .next/cache
RUN chown -R nextjs:nodejs .next

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy bootstrap seed script
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed-admin.mjs ./prisma/seed-admin.mjs
# Copy package.json (needed for prisma seed command config)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Bootstrap admin if BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD are set, then start app
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --skip-generate && if [ -n \"$BOOTSTRAP_EMAIL\" ] && [ -n \"$BOOTSTRAP_PASSWORD\" ]; then ./node_modules/.bin/prisma db seed; fi && node server.js"]
