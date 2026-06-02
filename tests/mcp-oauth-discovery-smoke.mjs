#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  discoverAuthorizationServerMetadata,
  discoverOAuthProtectedResourceMetadata,
  extractWWWAuthenticateParams
} from '@modelcontextprotocol/sdk/client/auth.js';

const mcpUrl = process.env.MCP_CLIENT_URL || 'https://d1vn7o33ycxs3a.cloudfront.net/mcp';

async function main() {
  const challengeResponse = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  });

  assert.equal(challengeResponse.status, 401, 'MCP should challenge unauthenticated clients');

  const { resourceMetadataUrl } = extractWWWAuthenticateParams(challengeResponse);
  assert.ok(resourceMetadataUrl, 'WWW-Authenticate should include resource_metadata');

  const resourceMetadata = await discoverOAuthProtectedResourceMetadata(mcpUrl, { resourceMetadataUrl });
  assert.equal(resourceMetadata.resource, mcpUrl, 'resource metadata should identify the MCP endpoint');
  assert.ok(
    resourceMetadata.authorization_servers?.[0],
    'resource metadata should advertise an authorization server'
  );

  const authorizationServerMetadata = await discoverAuthorizationServerMetadata(
    resourceMetadata.authorization_servers[0]
  );
  assert.ok(authorizationServerMetadata?.authorization_endpoint, 'AS metadata should include authorization endpoint');
  assert.ok(authorizationServerMetadata?.token_endpoint, 'AS metadata should include token endpoint');
  assert.ok(authorizationServerMetadata?.jwks_uri, 'AS metadata should include JWKS endpoint');

  console.log(`MCP OAuth discovery smoke test passed. resource_metadata=${resourceMetadataUrl}`);
  console.log(`Authorization server: ${resourceMetadata.authorization_servers[0]}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
