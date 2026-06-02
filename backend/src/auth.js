import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from './errors.js';
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

export function requireAuth(config = getConfig()) {
  return async (req, res, next) => {
    if (config.authDisabled) {
      req.user = { sub: 'local-dev', username: 'local-dev' };
      next();
      return;
    }

    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      next(new ApiError(401, 'Missing bearer token'));
      return;
    }

    if (!config.cognitoIssuer || !config.cognitoClientId) {
      next(new ApiError(500, 'Cognito configuration is incomplete'));
      return;
    }

    try {
      const { payload } = await jwtVerify(match[1], getJwks(config.cognitoIssuer), {
        issuer: config.cognitoIssuer
      });

      const tokenClientId = payload.client_id || payload.aud;
      if (tokenClientId !== config.cognitoClientId) {
        throw new ApiError(401, 'Token audience does not match this application');
      }

      req.user = {
        sub: payload.sub,
        username: payload.username || payload['cognito:username'] || payload.email,
        groups: payload['cognito:groups'] || []
      };
      next();
    } catch (error) {
      next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token'));
    }
  };
}
