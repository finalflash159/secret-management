import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Find or create a user for testing
  let user = await prisma.user.findFirst({
    where: { email: 'admin@gondor.io' }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@gondor.io',
        password: '$2a$10$test', // placeholder - won't work for login
        name: 'Admin User'
      }
    })
    console.log('Created user:', user.email)
  }

  // Check if Minas Tirith org already exists
  let org = await prisma.organization.findUnique({
    where: { slug: 'minas-tirith' }
  })

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Minas Tirith',
        slug: 'minas-tirith',
        avatar: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?w=200&h=200&fit=crop',
      }
    })
    console.log('Created organization:', org.name)
  } else {
    console.log('Organization already exists:', org.name)
  }

  // Check if user is already a member
  const existingMember = await prisma.orgMember.findFirst({
    where: { userId: user.id, orgId: org.id }
  })

  if (!existingMember) {
    await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: 'owner'
      }
    })
    console.log('Added user to organization')
  } else {
    console.log('User already a member')
  }

  // Check existing projects
  const existingProjects = await prisma.project.findMany({
    where: { orgId: org.id }
  })

  console.log(`Found ${existingProjects.length} existing projects`)

  // Create projects if they don't exist
  const projectData = [
    { name: 'Web Application', slug: 'web-app' },
    { name: 'Mobile API', slug: 'mobile-api' },
    { name: 'Infrastructure', slug: 'infrastructure' }
  ]

  const projects = []
  for (const pData of projectData) {
    let project = existingProjects.find(p => p.slug === pData.slug)

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: pData.name,
          slug: pData.slug,
          orgId: org.id,
          ownerId: user.id
        }
      })
      console.log(`Created project: ${project.name}`)
    } else {
      console.log(`Project already exists: ${project.name}`)
    }
    projects.push(project)
  }

  // Create environments and secrets for each project
  for (const project of projects) {
    // Check existing environments
    const existingEnvs = await prisma.projectEnvironment.findMany({
      where: { projectId: project.id }
    })

    // Create environments if they don't exist
    const envData = [
      { name: 'Development', slug: 'dev' },
      { name: 'Staging', slug: 'staging' },
      { name: 'Production', slug: 'prod' }
    ]

    const envs = []
    for (const eData of envData) {
      let env = existingEnvs.find(e => e.slug === eData.slug)

      if (!env) {
        env = await prisma.projectEnvironment.create({
          data: { name: eData.name, slug: eData.slug, projectId: project.id }
        })
      }
      envs.push(env)
    }

    // Create root folder if not exists
    const existingFolders = await prisma.folder.findMany({
      where: { projectId: project.id }
    })

    for (const env of envs) {
      let folder = existingFolders.find(f => f.envId === env.id && f.name === 'root')

      if (!folder) {
        folder = await prisma.folder.create({
          data: { name: 'root', projectId: project.id, envId: env.id }
        })
      }

      // Create secrets for production only
      if (env.slug === 'prod') {
        const existingSecrets = await prisma.secret.findMany({
          where: { projectId: project.id, envId: env.id }
        })

        if (existingSecrets.length === 0) {
          const secretData = getSecretsForProject(project.slug)

          for (const secret of secretData) {
            await prisma.secret.create({
              data: {
                key: secret.key,
                value: secret.value,
                projectId: project.id,
                envId: env.id,
                folderId: folder.id,
                createdBy: user.id,
                metadata: secret.metadata
              }
            })
          }
          console.log(`Created ${secretData.length} secrets for ${project.name} production`)
        } else {
          console.log(`Secrets already exist for ${project.name}`)
        }
      }
    }
  }

  console.log('\n✅ Seed completed successfully!')
  console.log('\nOrganization: Minas Tirith (minas-tirith)')
  console.log('Projects: Web Application, Mobile API, Infrastructure')
  console.log('Each project has: Dev, Staging, Production environments')
  console.log('Secrets created in Production environment')
}

function getSecretsForProject(projectSlug: string) {
  const baseSecrets = [
    { key: 'DATABASE_URL', value: 'postgres://user:pass@localhost:5432/db', metadata: { description: 'Main database connection' } },
    { key: 'REDIS_URL', value: 'redis://localhost:6379', metadata: { description: 'Cache server' } },
  ]

  switch (projectSlug) {
    case 'web-app':
      return [
        ...baseSecrets,
        { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.example.com', metadata: {} },
        { key: 'NEXTAUTH_SECRET', value: 'super-secret-key-change-in-prod', metadata: { description: 'NextAuth.js secret' } },
        { key: 'NEXTAUTH_URL', value: 'https://app.example.com', metadata: {} },
        { key: 'GOOGLE_CLIENT_ID', value: 'client-id.apps.googleusercontent.com', metadata: {} },
        { key: 'GOOGLE_CLIENT_SECRET', value: 'google-secret-key', metadata: {} },
        { key: 'STRIPE_PUBLIC_KEY', value: 'pk_test_xxx', metadata: {} },
        { key: 'STRIPE_SECRET_KEY', value: 'sk_test_xxx', metadata: {} },
      ]
    case 'mobile-api':
      return [
        ...baseSecrets,
        { key: 'API_BASE_URL', value: 'https://api.example.com/v1', metadata: {} },
        { key: 'JWT_SECRET', value: 'jwt-secret-key', metadata: {} },
        { key: 'AWS_ACCESS_KEY_ID', value: 'AKIAIOSFODNN7EXAMPLE', metadata: {} },
        { key: 'AWS_SECRET_ACCESS_KEY', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', metadata: {} },
        { key: 'S3_BUCKET', value: 'mobile-api-uploads', metadata: {} },
      ]
    case 'infrastructure':
      return [
        ...baseSecrets,
        { key: 'AWS_REGION', value: 'us-east-1', metadata: {} },
        { key: 'AWS_LAMBDA_FUNCTION', value: 'infrastructure-processor', metadata: {} },
        { key: 'TERRAFORM_STATE_BUCKET', value: 'terraform-state-prod', metadata: {} },
        { key: 'KUBERNETES_CLUSTER', value: 'production-cluster', metadata: {} },
        { key: 'HELM_CHART_VERSION', value: '3.12.0', metadata: {} },
        { key: 'MONITORING_ENDPOINT', value: 'https://monitoring.example.com', metadata: {} },
      ]
    default:
      return baseSecrets
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
