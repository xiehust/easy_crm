const runtimeConfig = window.__CRM_CONFIG__ || {};

export const config = {
  apiBaseUrl: runtimeConfig.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  awsRegion: runtimeConfig.AWS_REGION || import.meta.env.VITE_AWS_REGION || 'us-east-1',
  cognitoUserPoolId: runtimeConfig.COGNITO_USER_POOL_ID || import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  cognitoClientId: runtimeConfig.COGNITO_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  cognitoDomain: runtimeConfig.COGNITO_DOMAIN || import.meta.env.VITE_COGNITO_DOMAIN || '',
  redirectUri: runtimeConfig.COGNITO_REDIRECT_URI || import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  logoutUri: runtimeConfig.COGNITO_LOGOUT_URI || import.meta.env.VITE_COGNITO_LOGOUT_URI || window.location.origin
};

export function getAuthority() {
  if (!config.cognitoUserPoolId) {
    return '';
  }
  return `https://cognito-idp.${config.awsRegion}.amazonaws.com/${config.cognitoUserPoolId}`;
}

export function getHostedLogoutUrl() {
  if (!config.cognitoDomain || !config.cognitoClientId) {
    return config.logoutUri;
  }
  const params = new URLSearchParams({
    client_id: config.cognitoClientId,
    logout_uri: config.logoutUri
  });
  return `https://${config.cognitoDomain}/logout?${params.toString()}`;
}
