# Setup Guide — Secret Management (Gondor)

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local dev)

---

## 1. Clean Up (xóa container + database)

```bash
# Stop all running containers
docker compose -f docker-compose.prod.yml down

# Remove Docker volumes — DELETES all data (database, secrets, users)
docker compose -f docker-compose.prod.yml down -v

# Also clean dev containers if running
docker compose -f docker-compose.dev.yml down -v
```

---

## 2. Rebuild & Start (build lại + chạy container)

```bash
# Rebuild app image with fresh code (no cache)
docker compose -f docker-compose.prod.yml build --no-cache

# Start all services (postgres + app) in background
docker compose -f docker-compose.prod.yml up -d

# See logs live (optional — run in separate terminal)
docker compose -f docker-compose.prod.yml up
```

---

## 3. Database Setup (tạo bảng)

Database schema được apply **tự động** khi container start (qua `db push` trong entrypoint của Dockerfile).

Nếu cần chạy thủ công hoặc dùng `migrate` thay vì `db push`:

```bash
# Xem trạng thái migration
docker compose -f docker-compose.prod.yml exec app npx prisma migrate status

# Tạo migration mới (khi có thay đổi schema)
docker compose -f docker-compose.prod.yml exec app npx prisma migrate dev --name add_new_table

# Hoặc push schema trực tiếp (không tạo migration)
docker compose -f docker-compose.prod.yml exec app npx prisma db push

# Generate Prisma client
docker compose -f docker-compose.prod.yml exec app npx prisma generate

# Reset database (xóa hết bảng rồi tạo lại)
docker compose -f docker-compose.prod.yml exec app npx prisma db push --force-reset
```

---

## 4. Bootstrap Admin User (tạo admin đầu tiên)

```bash
# Interactive mode
docker compose -f docker-compose.prod.yml exec app npm run bootstrap

# Non-interactive (copy-paste one-liner)
docker compose -f docker-compose.prod.yml exec app npm run bootstrap -- \
  --email admin@gondor.dev \
  --password "Admin123456!" \
  --name "Admin"
```

---

## 5. Verify (kiểm tra)

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check app logs
docker compose -f docker-compose.prod.yml logs app --tail=20

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres --tail=5

# Open Prisma Studio (database GUI in browser)
docker compose -f docker-compose.prod.yml exec app npx prisma studio
```

---

## 6. Quick Full Reset (reset nhanh — một lệnh)

```bash
# Stop → xóa data → rebuild → start → tự động setup DB → tạo admin
docker compose -f docker-compose.prod.yml down -v && \
docker compose -f docker-compose.prod.yml build --no-cache && \
docker compose -f docker-compose.prod.yml up -d && \
sleep 5 && \
docker compose -f docker-compose.prod.yml exec app npx prisma db push && \
docker compose -f docker-compose.prod.yml exec app npx prisma generate && \
docker compose -f docker-compose.prod.yml exec app npm run bootstrap -- \
  --email admin@gondor.dev \
  --password "Admin123456!" \
  --name "Admin"
```

---

## 7. Dev Mode (chạy local, không Docker app)

```bash
# Chỉ start postgres
docker compose -f docker-compose.dev.yml up -d

# Chạy Prisma: tạo bảng trong database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Terminal khác: chạy dev server
npm run dev

# Tạo admin đầu tiên
npm run bootstrap
```

---

## Environment Variables

File `.env` cần có đủ các biến sau:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/secret_manager"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-key-change-in-production-minimum-32-chars"
AUTH_SECRET="super-secret-key-change-in-production-minimum-32-chars"
MASTER_KEY="your-32-byte-master-key-here!!!"
SUPER_MASTER_ADMIN=false
CRON_SECRET="any_secret"
```

> **Lưu ý:** `AUTH_SECRET` phải giống `NEXTAUTH_SECRET` (NextAuth v5 yêu cầu cả hai).

## Mở app

Sau khi setup xong:
- **App:** http://localhost:3000
- **Login:** admin@gondor.dev / Admin123456!
