const integrationTypes = [
  {
    id: 'github',
    name: 'GitHub',
    logo: '/logos/github-logo.png',
    description: 'CI/CD and secrets sync',
    hasBg: true,
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'ghp_xxxx' },
      { key: 'repository', label: 'Repository', type: 'text', placeholder: 'owner/repo' },
    ],
  },
  {
    id: 'aws',
    name: 'AWS Secrets Manager',
    logo: '/logos/aws-logo.png',
    description: 'Sync with AWS Secrets Manager',
    hasBg: true,
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'xxxx' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'azure',
    name: 'Azure Key Vault',
    logo: '/logos/azure-logo.png',
    description: 'Sync with Azure Key Vault',
    hasBg: true,
    fields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'xxxx' },
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'xxxx' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'xxxx' },
      { key: 'vaultName', label: 'Vault Name', type: 'text', placeholder: 'my-vault' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: '/logos/slack-logo.png',
    description: 'Notifications and alerts',
    hasBg: true,
    bgColor: '#481449',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/...' },
      { key: 'channel', label: 'Channel', type: 'text', placeholder: '#alerts' },
    ],
  },
];

export { integrationTypes };
