/**
 * Bootstrap Admin CLI
 *
 * Creates the first admin user for the application.
 * Run once: npm run bootstrap
 *
 * Usage:
 *   npm run bootstrap              # Interactive prompts
 *   npm run bootstrap -- --email admin@example.com --password Secret123! --name "Admin"
 *   npm run bootstrap -- --help
 *
 * Environment:
 *   DATABASE_URL must be set (from .env)
 *
 * Notes:
 *   The bootstrap user is always created with isMasterAdmin=true.
 *   Whether this flag has effect depends on SUPER_MASTER_ADMIN env var:
 *     - true:  only isMasterAdmin=true users can create orgs (bootstrap user is always eligible)
 *     - false: isMasterAdmin is ignored, any user can create orgs
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askSecret(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
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
    console.log(`\n⚠️  Database already has ${userCount} user(s).\n`);
    console.log('   To reset, run: npx prisma db push --force-reset');
    console.log('   Then run this script again.\n');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Parse CLI args for non-interactive mode
  const args = process.argv.slice(2);
  let email = '';
  let password = '';
  let name = '';
  let nonInteractive = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) email = args[++i];
    if (args[i] === '--password' && args[i + 1]) password = args[++i];
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: npm run bootstrap [options]');
      console.log('Options:');
      console.log('  --email <email>   Admin email');
      console.log('  --password <pass> Admin password (min 8 chars)');
      console.log('  --name <name>     Admin display name');
      await prisma.$disconnect();
      process.exit(0);
    }
  }

  if (email && password) nonInteractive = true;

  // Interactive prompts
  if (!nonInteractive) {
    console.log('\n📝  First-time setup — no users found.\n');

    email = await ask('   Admin email: ');
    while (!email || !email.includes('@')) {
      if (email) console.log('   ⚠️  Please enter a valid email');
      email = await ask('   Admin email: ');
    }

    password = await askSecret('   Password (min 8 chars): ');
    while (password.length < 8) {
      if (password) console.log('   ⚠️  Password must be at least 8 characters');
      password = await askSecret('   Password (min 8 chars): ');
    }

    name = await ask('   Display name (optional, press Enter to skip): ');
  } else {
    console.log('\n📝  Creating admin from CLI arguments...\n');
    if (!email || !password) {
      console.error('❌  --email and --password are required in non-interactive mode');
      await prisma.$disconnect();
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('❌  Password must be at least 8 characters');
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // Create user
  console.log('\n⏳  Creating admin user...\n');

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        isMasterAdmin: true,   // always true for bootstrap user
      },
    });

    console.log('✅  Admin user created successfully!\n');
    console.log('─'.repeat(40));
    console.log(`   Email:         ${user.email}`);
    console.log(`   Name:          ${user.name || '(none)'}`);
    console.log('─'.repeat(40));
    console.log('\n⚠️  Save these credentials — they are not stored anywhere else.');
    console.log('   You can now log in at /login\n');
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      console.error(`\n❌  A user with email "${email}" already exists.\n`);
    } else {
      console.error('\n❌  Failed to create user:', err);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
