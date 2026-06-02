import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getConfig } from './config.js';

let jwks;
let jwksIssuer;

function getJwks(issuer) {
  if (!jwks || jwksIssuer !== issuer) {
    jwksIssuer = issuer;
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

async function defaultVerifyJwt(token, config) {
  return jwtVerify(token, getJwks(config.cognitoIssuer), {
    issuer: config.cognitoIssuer
  });
}

function getAllowedClientIds(config) {
  const clientIds = config.cognitoClientIds?.length ? config.cognitoClientIds : [config.cognitoClientId];
  return clientIds.filter(Boolean);
}

export function getOAuthProtectedResourceMetadataUrl(resourceUrl) {
  const url = new URL(resourceUrl);
  const resourcePath = url.pathname && url.pathname !== '/' ? url.pathname : '';
  return new URL(`/.well-known/oauth-protected-resource${resourcePath}`, url).href;
}

function getRequestResourceUrl(req) {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) {
    return '';
  }
  return `${proto}://${host}/mcp`;
}

function getResourceUrl(req, config) {
  return config.mcpResourceUrl || getRequestResourceUrl(req);
}

function getWwwAuthenticateHeader(message, req, config) {
  const resourceUrl = getResourceUrl(req, config);
  const parts = [
    'Bearer error="invalid_token"',
    `error_description="${message}"`
  ];
  if (resourceUrl) {
    parts.push(`resource_metadata="${getOAuthProtectedResourceMetadataUrl(resourceUrl)}"`);
  }
  return parts.join(', ');
}

export function getOAuthProtectedResourceMetadata(req, config = getConfig()) {
  const resource = getResourceUrl(req, config);
  const metadata = {
    resource,
    authorization_servers: [config.cognitoIssuer],
    jwks_uri: `${config.cognitoIssuer}/.well-known/jwks.json`,
    bearer_methods_supported: ['header'],
    resource_name: config.mcpResourceName || 'Easy CRM MCP',
    scopes_supported: config.oauthScopes || ['openid', 'email', 'profile']
  };

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => (
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    ))
  );
}

export async function verifyCognitoAccessToken(token, config, verifyJwt = defaultVerifyJwt) {
  const { payload } = await verifyJwt(token, config);
  if (payload.token_use !== 'access') {
    throw new Error('Token must be a Cognito access token');
  }
  const tokenClientId = payload.client_id || payload.aud;
  if (!getAllowedClientIds(config).includes(tokenClientId)) {
    throw new Error('Token audience does not match this application');
  }
  return {
    sub: payload.sub,
    username: payload.username || payload['cognito:username'] || payload.email,
    groups: payload['cognito:groups'] || []
  };
}

export function requireCognitoAuth(config = getConfig(), verifyToken = verifyCognitoAccessToken) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.set('WWW-Authenticate', getWwwAuthenticateHeader('Missing bearer token', req, config));
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    if (!config.cognitoIssuer || getAllowedClientIds(config).length === 0) {
      res.status(500).json({ error: 'Cognito configuration is incomplete' });
      return;
    }

    try {
      req.user = await verifyToken(match[1], config);
      next();
    } catch {
      res.set('WWW-Authenticate', getWwwAuthenticateHeader('Invalid or expired token', req, config));
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
