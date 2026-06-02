import { describe, expect, test } from 'vitest';
import { createHttpApp } from '../src/server.js';

async function withTestServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

describe('MCP HTTP app', () => {
  const config = {
    cognitoIssuer: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example',
    cognitoClientId: 'client',
    mcpResourceUrl: 'https://crm.example.com/mcp'
  };

  test('keeps health checks public', async () => {
    const app = createHttpApp(config);

    await withTestServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    });
  });

  test('requires Cognito auth for MCP requests', async () => {
    const app = createHttpApp(config);

    await withTestServer(app, async (baseUrl) => {
      const postResponse = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      });
      const getResponse = await fetch(`${baseUrl}/mcp`);

      for (const response of [postResponse, getResponse]) {
        expect(response.status).toBe(401);
        expect(response.headers.get('www-authenticate')).toBe(
          'Bearer error="invalid_token", error_description="Missing bearer token", resource_metadata="https://crm.example.com/.well-known/oauth-protected-resource/mcp"'
        );
        expect(await response.json()).toEqual({ error: 'Missing bearer token' });
      }
    });
  });

  test('serves OAuth protected resource metadata for MCP clients', async () => {
    const app = createHttpApp(config);

    await withTestServer(app, async (baseUrl) => {
      for (const path of [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-protected-resource/mcp'
      ]) {
        const response = await fetch(`${baseUrl}${path}`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(await response.json()).toEqual({
          resource: 'https://crm.example.com/mcp',
          authorization_servers: ['https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example'],
          jwks_uri: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_example/.well-known/jwks.json',
          bearer_methods_supported: ['header'],
          resource_name: 'Easy CRM MCP',
          scopes_supported: ['openid', 'email', 'profile']
        });
      }
    });
  });
});
