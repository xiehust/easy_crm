# Easy CRM

Easy CRM is an npm workspace monorepo with a React frontend, an Express REST API, a Node.js MCP server, PostgreSQL schema migrations, and an AWS CDK deployment.

## Architecture
![alt text](assets/aws-high-level-architecture.png)

## Project Layout

- `frontend/`: Vite React SPA with Cognito OIDC login.
- `backend/`: Express REST API backed by PostgreSQL.
- `mcp-server/`: HTTP and stdio MCP server for CRM tools.
- `database/migrations/`: PostgreSQL schema migrations.
- `infra/`: AWS CDK stack for Cognito, CloudFront, ECS Fargate, Aurora PostgreSQL, and supporting resources.
- `scripts/`: local startup, deploy, and destroy scripts.

## Local Commands

```bash
npm run install:all
npm test
npm run lint
npm run build
```

For Docker-based local development:

```bash
./scripts/local-up.sh
```

## AWS Deployment

The demo stack is deployed with CloudFormation stack `EasyCrmStack`.

```bash
AWS_REGION=<AWS_REGION> ./scripts/deploy.sh
```

If an external MCP client gives you a specific OAuth callback URL, pass it to the confidential MCP Cognito app client during deployment:

```bash
AWS_REGION=<AWS_REGION> ./scripts/deploy.sh \
  --parameters McpOAuthCallbackUrls='https://client.example.com/oauth/callback'
```

`McpOAuthCallbackUrls` is a comma-delimited list, so multiple callback URLs can be passed in one value:

```bash
AWS_REGION=<AWS_REGION> ./scripts/deploy.sh \
  --parameters McpOAuthCallbackUrls='https://client.example.com/callback,https://client.example.com/alt-callback'
```

## MCP OAuth Configuration

The stack creates two Cognito app clients:

- `CognitoAppClientId`: public SPA app client without a client secret.
- `CognitoMcpAppClientId`: confidential MCP app client with a client secret.

Use the confidential MCP app client for tools that require `Client ID`, `Client secret`, and `Token URL`.
The Cognito domain uses newer managed login and registers `McpEndpoint` as a Cognito resource server so Amazon Quick can request RFC 8707 resource-bound access tokens.

After deployment, fetch the values from CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --region <AWS_REGION> \
  --stack-name EasyCrmStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

Then run the `CognitoMcpClientSecretCommand` output to retrieve the MCP client secret.

The MCP client configuration should use:

- `Client ID`: `CognitoMcpAppClientId`
- `Client secret`: value returned by `CognitoMcpClientSecretCommand`
- `Token URL`: `CognitoMcpTokenUrl`
- `Authorization URL`: `CognitoMcpAuthorizeUrl`
- `Scopes`: `openid email profile`
- `Resource URL`: `McpEndpoint`
- `Resource server identifier`: `CognitoMcpResourceServerIdentifier`

```bash
aws cognito-idp describe-user-pool-client \
  --region <AWS_REGION> \
  --user-pool-id <CognitoUserPoolId> \
  --client-id <CognitoMcpAppClientId> \
  --query UserPoolClient.ClientSecret \
  --output text
```

For Codex MCP configuration with the public client, this command is still supported:

```bash
MCP_ENDPOINT="<McpEndpoint>"
COGNITO_APP_CLIENT_ID="<CognitoAppClientId>"

codex mcp add easycrm \
  --url "$MCP_ENDPOINT" \
  --oauth-client-id "$COGNITO_APP_CLIENT_ID" \
  --oauth-resource "$MCP_ENDPOINT"
```

## Security Notes

Do not commit `.env`, Cognito client secrets, database passwords, AWS credentials, or generated tokens. Cognito, database, and MCP secrets are configured through AWS/CDK and AWS service-managed secret handling.
