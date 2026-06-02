import express from 'express';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { getOAuthProtectedResourceMetadata, requireCognitoAuth } from './auth.js';
import { getConfig } from './config.js';
import {
  createContact,
  createCustomer,
  createDeal,
  getCustomer,
  getDashboardSummary,
  listContacts,
  listCustomers,
  listDeals,
  updateCustomer
} from './repository.js';
import { withToolErrors } from './tool-result.js';

const customerInput = {
  name: z.string().min(1).max(255),
  industry: z.string().max(160).optional(),
  website: z.string().max(255).optional(),
  notes: z.string().max(5000).optional()
};

const customerUpdateInput = {
  id: z.string().uuid(),
  ...customerInput
};

const contactInput = {
  customer_id: z.string().uuid(),
  first_name: z.string().min(1).max(120),
  last_name: z.string().min(1).max(120),
  email: z.string().max(255).optional(),
  phone: z.string().max(80).optional(),
  title: z.string().max(160).optional()
};

const dealInput = {
  customer_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  amount: z.number().min(0).optional(),
  stage: z.enum(['prospecting', 'qualified', 'proposal', 'won', 'lost']).optional(),
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(5000).optional()
};

export function createServer() {
  const server = new McpServer({
    name: 'easy-crm-mcp',
    version: '0.1.0'
  });

  server.registerTool(
    'list_customers',
    {
      title: 'List customers',
      description: 'Query CRM customers. Supports a case-insensitive search keyword.',
      inputSchema: { search: z.string().optional() }
    },
    withToolErrors(listCustomers)
  );

  server.registerTool(
    'get_customer',
    {
      title: 'Get customer',
      description: 'Get a customer by ID, including related contacts and deals.',
      inputSchema: { id: z.string().uuid() }
    },
    withToolErrors(getCustomer)
  );

  server.registerTool(
    'create_customer',
    {
      title: 'Create customer',
      description: 'Create a CRM customer.',
      inputSchema: customerInput
    },
    withToolErrors(createCustomer)
  );

  server.registerTool(
    'update_customer',
    {
      title: 'Update customer',
      description: 'Update an existing CRM customer.',
      inputSchema: customerUpdateInput
    },
    withToolErrors(updateCustomer)
  );

  server.registerTool(
    'list_contacts',
    {
      title: 'List contacts',
      description: 'List CRM contacts. Optionally filter by customer ID.',
      inputSchema: { customer_id: z.string().uuid().optional() }
    },
    withToolErrors(listContacts)
  );

  server.registerTool(
    'create_contact',
    {
      title: 'Create contact',
      description: 'Create a CRM contact linked to a customer.',
      inputSchema: contactInput
    },
    withToolErrors(createContact)
  );

  server.registerTool(
    'list_deals',
    {
      title: 'List deals',
      description: 'List sales deals. Optionally filter by customer ID or stage.',
      inputSchema: {
        customer_id: z.string().uuid().optional(),
        stage: z.enum(['prospecting', 'qualified', 'proposal', 'won', 'lost']).optional()
      }
    },
    withToolErrors(listDeals)
  );

  server.registerTool(
    'create_deal',
    {
      title: 'Create deal',
      description: 'Create a sales opportunity linked to a customer.',
      inputSchema: dealInput
    },
    withToolErrors(createDeal)
  );

  server.registerTool(
    'get_dashboard_summary',
    {
      title: 'Get dashboard summary',
      description: 'Return customer, contact, deal and pipeline totals.',
      inputSchema: {}
    },
    withToolErrors(getDashboardSummary)
  );

  return server;
}

async function startStdio(config) {
  if (!config.serviceToken) {
    console.error('MCP_SERVICE_TOKEN should be set for local stdio clients so access is explicit in client config.');
  }
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}

export function createHttpApp(config) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get([
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/mcp'
  ], (req, res) => {
    res.json(getOAuthProtectedResourceMetadata(req, config));
  });
  app.get('/mcp', requireCognitoAuth(config), async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
  app.post('/mcp', requireCognitoAuth(config), async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  return app;
}

async function startHttp(config) {
  const app = createHttpApp(config);
  app.listen(config.port, () => {
    console.log(`Easy CRM MCP HTTP server listening on port ${config.port}`);
  });
}

export async function start(config = getConfig()) {
  if (config.transport === 'http') {
    await startHttp(config);
  } else {
    await startStdio(config);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
