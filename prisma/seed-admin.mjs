/**
 * Bootstrap Admin — Prisma Seed
 *
 * Creates the first admin user for the application.
 * Run via: npx prisma db seed
 *
 * Non-interactive: set BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD, BOOTSTRAP_NAME env vars.
 * Interactive: npx prisma db seed (no env vars = prompts)
 *
 * Environment:
 *   DATABASE_URL must be set (from .env)
 *
 * Notes:
 *   The bootstrap user is always created with isMasterAdmin=true.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `$2a$12$${salt}$${hash}`; // bcrypt-format for compatibility
}

async function main() {
  console.log('\n🔐  Secret Manager — Bootstrap Admin\n');
  console.log('─'.repeat(40));

  // Check DB connection
  try {
    await prisma.$connect();
    console.log('✅  Database connected');
  } catch (err) {
    console.error('❌  Cannot connect to database. Check DATABASE_URL in .env');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Check if users exist
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`\n⚠️  Database already has ${userCount} user(s). Skipping bootstrap.\n`);
    await prisma.$disconnect();
    process.exit(0);
  }

  // Get args from CLI or env
  let email = process.env.BOOTSTRAP_EMAIL || '';
  let password = process.env.BOOTSTRAP_PASSWORD || '';
  let name = process.env.BOOTSTRAP_NAME || '';

  // Interactive prompts if no env vars
  if (!email || !password) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const ask = (q) =>
      new Promise((resolve) => {
        rl.question(q, (a) => resolve(a.trim()));
      });

    console.log('\n📝  First-time setup — no users found.\n');
    while (!email || !email.includes('@')) {
      if (email) console.log('   ⚠️  Please enter a valid email');
      email = (await ask('   Admin email: ')) || '';
    }
    while (password.length < 8) {
      if (password) console.log('   ⚠️  Password must be at least 8 characters');
      password = (await ask('   Password (min 8 chars): ')) || '';
    }
    name = (await ask('   Display name (optional, press Enter to skip): ')) || '';
    rl.close();
  }

  // Validate
  if (password.length < 8) {
    console.error('\n❌  Password must be at least 8 characters\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Create user
  console.log('\n⏳  Creating admin user...\n');

  try {
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        isMasterAdmin: true,
      },
    });

    console.log('✅  Admin user created successfully!\n');
    console.log('─'.repeat(40));
    console.log(`   Email:         ${user.email}`);
    console.log(`   Name:          ${user.name || '(none)'}`);
    console.log('─'.repeat(40));
    console.log('\n⚠️  Save these credentials — they are not stored anywhere else.');
    console.log('   You can now log in at /login\n');
  } catch (err) {
    if (err.code === 'P2002') {
      console.error(`\n❌  A user with email "${email}" already exists.\n`);
    } else {
      console.error('\n❌  Failed to create user:', err.message || err);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
