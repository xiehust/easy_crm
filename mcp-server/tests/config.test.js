import { afterEach, describe, expect, test } from 'vitest';
import { getConfig } from '../src/config.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('MCP config', () => {
  test('parses all configured Cognito app client IDs', () => {
    process.env.COGNITO_CLIENT_ID = 'web-client';
    process.env.COGNITO_CLIENT_IDS = 'web-client,mcp-confidential-client';

    expect(getConfig().cognitoClientIds).toEqual(['web-client', 'mcp-confidential-client']);
  });
});
