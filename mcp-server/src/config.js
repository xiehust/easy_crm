import dotenv from 'dotenv';

dotenv.config();

function parseList(value = '') {
  return value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

export function getConfig() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
  const cognitoClientId = process.env.COGNITO_CLIENT_ID || '';
  const cognitoClientIds = Array.from(new Set([
    cognitoClientId,
    ...parseList(process.env.COGNITO_CLIENT_IDS)
  ].filter(Boolean)));

  return {
    transport: process.env.MCP_TRANSPORT || 'stdio',
    port: Number(process.env.MCP_PORT || 4111),
    serviceToken: process.env.MCP_SERVICE_TOKEN || '',
    awsRegion: region,
    cognitoUserPoolId: userPoolId,
    cognitoClientId,
    cognitoClientIds,
    cognitoIssuer: process.env.COGNITO_ISSUER || (userPoolId ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}` : ''),
    mcpResourceUrl: process.env.MCP_RESOURCE_URL || '',
    mcpResourceName: process.env.MCP_RESOURCE_NAME || 'Easy CRM MCP',
    oauthScopes: (process.env.MCP_OAUTH_SCOPES || 'openid email profile').split(/\s+/).filter(Boolean)
  };
}

export function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false
    };
  }

  return {
    host: process.env.PGHOST || process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DATABASE_PORT || 5432),
    database: process.env.PGDATABASE || process.env.DATABASE_NAME || 'easy_crm',
    user: process.env.PGUSER || process.env.DATABASE_USER || 'crm',
    password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD || 'crm_dev_password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false
  };
}
