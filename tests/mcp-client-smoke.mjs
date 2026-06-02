#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const expectedTools = [
  'list_customers',
  'get_customer',
  'create_customer',
  'update_customer',
  'list_contacts',
  'create_contact',
  'list_deals',
  'create_deal',
  'get_dashboard_summary'
];

function cleanEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => typeof value === 'string')
  );
}

async function withTimeout(label, promise, timeoutMs = 10_000) {
  let timeout;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

function parseToolTextResult(result) {
  assert.equal(result.content?.[0]?.type, 'text', 'tool result should contain text content');
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.ok, true, 'tool result payload should be successful');
  return payload.data;
}

function createTransport() {
  if (process.env.MCP_CLIENT_URL) {
    if (!process.env.MCP_CLIENT_ACCESS_TOKEN) {
      throw new Error('MCP_CLIENT_ACCESS_TOKEN is required when MCP_CLIENT_URL is set');
    }
    return new StreamableHTTPClientTransport(new URL(process.env.MCP_CLIENT_URL), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.MCP_CLIENT_ACCESS_TOKEN}`
        }
      }
    });
  }

  return new StdioClientTransport({
    command: process.execPath,
    args: [path.join(rootDir, 'mcp-server', 'src', 'server.js')],
    cwd: rootDir,
    env: {
      ...cleanEnv(process.env),
      MCP_TRANSPORT: 'stdio',
      MCP_SERVICE_TOKEN: process.env.MCP_SERVICE_TOKEN || 'local-mcp-client-smoke-token'
    },
    stderr: 'pipe'
  });
}

async function main() {
  const transport = createTransport();

  let stderr = '';
  if ('stderr' in transport) {
    transport.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
  }

  const client = new Client({
    name: 'easy-crm-mcp-smoke-client',
    version: '0.1.0'
  });

  try {
    await withTimeout('MCP client connect', client.connect(transport));

    const toolsResult = await withTimeout('MCP tools/list', client.listTools());
    const toolNames = toolsResult.tools.map((tool) => tool.name).sort();

    assert.deepEqual(toolNames, [...expectedTools].sort(), 'MCP server should expose the expected tools');

    if (process.env.MCP_CLIENT_CALL_TOOL === 'true') {
      const summaryResult = await withTimeout(
        'MCP tools/call get_dashboard_summary',
        client.callTool({ name: 'get_dashboard_summary', arguments: {} })
      );
      const summary = parseToolTextResult(summaryResult);
      for (const field of ['customer_count', 'contact_count', 'deal_count', 'deal_amount_total']) {
        assert.equal(typeof summary[field], 'number', `dashboard summary should include numeric ${field}`);
      }
    }

    console.log(`MCP server smoke test passed. Tools: ${toolNames.join(', ')}`);
  } catch (error) {
    if (stderr.trim()) {
      console.error('MCP server stderr:');
      console.error(stderr.trim());
    }
    throw error;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
