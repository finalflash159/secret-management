const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: 'minas-tirith' } });
  const user = await prisma.user.findUnique({ where: { email: 'vo.m.thinh@gmail.com' }});

  if (!org || !user) {
    console.log('Org or user not found');
    return;
  }

  console.log('Creating projects...');

  // Create projects if they don't exist
  const projectData = [
    { name: 'Web Application', slug: 'web-app' },
    { name: 'Mobile API', slug: 'mobile-api' },
    { name: 'Infrastructure', slug: 'infrastructure' }
  ];

  const projects = [];
  for (const p of projectData) {
    let project = await prisma.project.findFirst({
      where: { orgId: org.id, slug: p.slug }
    });
    if (!project) {
      project = await prisma.project.create({
        data: { name: p.name, slug: p.slug, orgId: org.id, ownerId: user.id }
      });
      console.log('Created project:', p.name);
    } else {
      console.log('Project already exists:', p.name);
    }
    projects.push(project);
  }

  // Create environments and secrets for each project
  for (const project of projects) {
    // Create environments if they don't exist
    const envData = [
      { name: 'Development', slug: 'dev' },
      { name: 'Staging', slug: 'staging' },
      { name: 'Production', slug: 'prod' }
    ];

    const envs = [];
    for (const e of envData) {
      let env = await prisma.projectEnvironment.findFirst({
        where: { projectId: project.id, slug: e.slug }
      });
      if (!env) {
        env = await prisma.projectEnvironment.create({
          data: { projectId: project.id, name: e.name, slug: e.slug }
        });
        console.log('Created env:', e.name, 'for', project.name);
      }
      envs.push(env);
    }

    // Create folders if they don't exist
    const folderData = ['Database', 'API Keys', 'Credentials'];
    const folders = [];
    for (const f of folderData) {
      let folder = await prisma.folder.findFirst({
        where: { projectId: project.id, name: f, envId: envs[0].id }
      });
      if (!folder) {
        folder = await prisma.folder.create({
          data: { projectId: project.id, envId: envs[0].id, name: f }
        });
        console.log('Created folder:', f, 'for', project.name);
      }
      folders.push(folder);
    }

    // Create secrets if they don't exist
    const secretsData = [
      // Database secrets
      { key: 'DATABASE_URL', folderId: folders[0].id, envId: envs[0].id, value: 'postgresql://dev:dev@localhost:5432/webapp_dev' },
      { key: 'DATABASE_POOL_SIZE', folderId: folders[0].id, envId: envs[0].id, value: '5' },

      // API Keys
      { key: 'STRIPE_API_KEY', folderId: folders[1].id, envId: envs[0].id, value: 'sk_test_***' },
      { key: 'SENDGRID_API_KEY', folderId: folders[1].id, envId: envs[0].id, value: 'SG.***' },
      { key: 'OPENAI_API_KEY', folderId: folders[1].id, envId: envs[0].id, value: 'sk-***' },

      // Credentials
      { key: 'JWT_SECRET', folderId: folders[2].id, envId: envs[0].id, value: 'dev-secret-key-123' },
      { key: 'AWS_ACCESS_KEY_ID', folderId: folders[2].id, envId: envs[0].id, value: 'AKIA***' },
    ];

    let secretsCreated = 0;
    for (const s of secretsData) {
      const existing = await prisma.secret.findFirst({
        where: { key: s.key, envId: s.envId, folderId: s.folderId }
      });
      if (!existing) {
        await prisma.secret.create({
          data: {
            key: s.key,
            value: s.value,
            envId: s.envId,
            folderId: s.folderId,
            projectId: project.id,
            createdBy: user.id,
            updatedBy: user.id
          }
        });
        secretsCreated++;
      }
    }
    if (secretsCreated > 0) {
      console.log('Created', secretsCreated, 'secrets for', project.name);
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
