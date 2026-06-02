import { describe, expect, test, vi } from 'vitest';
import {
  getOAuthProtectedResourceMetadataUrl,
  requireCognitoAuth,
  verifyCognitoAccessToken
} from '../src/auth.js';

function createReq(header = '') {
  return {
    get: (name) => (name.toLowerCase() === 'authorization' ? header : '')
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: new Map(),
    set(name, value) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('MCP Cognito auth middleware', () => {
  test('builds path-aware protected resource metadata URLs', () => {
    expect(getOAuthProtectedResourceMetadataUrl('https://crm.example.com/mcp')).toBe(
      'https://crm.example.com/.well-known/oauth-protected-resource/mcp'
    );
  });

  test('rejects requests without a bearer token', async () => {
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    await requireCognitoAuth({
      cognitoIssuer: 'issuer',
      cognitoClientId: 'client',
      mcpResourceUrl: 'https://crm.example.com/mcp'
    })(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Missing bearer token' });
    expect(res.headers.get('www-authenticate')).toBe(
      'Bearer error="invalid_token", error_description="Missing bearer token", resource_metadata="https://crm.example.com/.well-known/oauth-protected-resource/mcp"'
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects requests when Cognito configuration is incomplete', async () => {
    const req = createReq('Bearer token');
    const res = createRes();
    const next = vi.fn();

    await requireCognitoAuth({ cognitoIssuer: '', cognitoClientId: 'client' })(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Cognito configuration is incomplete' });
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches the verified Cognito user and continues', async () => {
    const req = createReq('Bearer token');
    const res = createRes();
    const next = vi.fn();
    const verifyToken = vi.fn(async () => ({ sub: 'user-1', username: 'tester', groups: ['crm'] }));

    await requireCognitoAuth({ cognitoIssuer: 'issuer', cognitoClientId: 'client' }, verifyToken)(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('token', { cognitoIssuer: 'issuer', cognitoClientId: 'client' });
    expect(req.user).toEqual({ sub: 'user-1', username: 'tester', groups: ['crm'] });
    expect(next).toHaveBeenCalledOnce();
  });

  test('rejects invalid or expired tokens', async () => {
    const req = createReq('Bearer bad-token');
    const res = createRes();
    const next = vi.fn();
    const verifyToken = vi.fn(async () => {
      throw new Error('Invalid or expired token');
    });

    await requireCognitoAuth({ cognitoIssuer: 'issuer', cognitoClientId: 'client' }, verifyToken)(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects tokens for another Cognito app client', async () => {
    await expect(
      verifyCognitoAccessToken('token', {
        cognitoIssuer: 'issuer',
        cognitoClientId: 'client'
      }, async () => ({ payload: { sub: 'user-1', client_id: 'other-client', token_use: 'access' } }))
    ).rejects.toThrow('Token audience does not match this application');
  });

  test('accepts tokens for any configured Cognito app client', async () => {
    await expect(
      verifyCognitoAccessToken('token', {
        cognitoIssuer: 'issuer',
        cognitoClientId: 'web-client',
        cognitoClientIds: ['web-client', 'mcp-confidential-client']
      }, async () => ({
        payload: {
          sub: 'user-1',
          username: 'tester',
          client_id: 'mcp-confidential-client',
          token_use: 'access'
        }
      }))
    ).resolves.toEqual({ sub: 'user-1', username: 'tester', groups: [] });
  });

  test('rejects non-access Cognito tokens', async () => {
    await expect(
      verifyCognitoAccessToken('token', {
        cognitoIssuer: 'issuer',
        cognitoClientId: 'client'
      }, async () => ({ payload: { sub: 'user-1', client_id: 'client', token_use: 'id' } }))
    ).rejects.toThrow('Token must be a Cognito access token');
  });
});
