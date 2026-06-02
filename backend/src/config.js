import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
  return {
    port: Number(process.env.PORT || 4000),
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim()),
    authDisabled: process.env.AUTH_DISABLED === 'true',
    awsRegion: region,
    cognitoUserPoolId: userPoolId,
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
    cognitoIssuer: process.env.COGNITO_ISSUER || (userPoolId ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}` : '')
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
