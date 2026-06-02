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

The demo stack is deployed with CloudFormation stack `EasyCrmStack`. The current target region is `us-east-2`.

```bash
AWS_REGION=us-east-2 ./scripts/deploy.sh
```

If an external MCP client gives you a specific OAuth callback URL, pass it to the confidential MCP Cognito app client during deployment:

```bash
AWS_REGION=us-east-2 ./scripts/deploy.sh \
  --parameters McpOAuthCallbackUrls='https://client.example.com/oauth/callback'
```

`McpOAuthCallbackUrls` is a comma-delimited list, so multiple callback URLs can be passed in one value:

```bash
AWS_REGION=us-east-2 ./scripts/deploy.sh \
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
  --region us-east-2 \
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

Current `us-east-2` deployment values:

- `Client ID`: `41td8cdvp4kbg1hkk8i7uclo3j`
- `Client secret`: run the command below
- `Token URL`: `https://easy-crm-c8cdd506.auth.us-east-2.amazoncognito.com/oauth2/token`
- `Authorization URL`: `https://easy-crm-c8cdd506.auth.us-east-2.amazoncognito.com/oauth2/authorize`
- `Scopes`: `openid email profile`
- `Resource URL`: `https://d1vn7o33ycxs3a.cloudfront.net/mcp`
- `Resource server identifier`: `https://d1vn7o33ycxs3a.cloudfront.net/mcp`
- `Callback URLs`: `https://us-east-1.quicksight.aws.amazon.com/sn/account/anycompany-digital/oauthcallback`, `https://us-east-1.quicksight.aws.amazon.com/sn/oauthcallback`, `http://localhost:5555/callback/zJW_9JhwgoXA`

```bash
aws cognito-idp describe-user-pool-client \
  --region us-east-2 \
  --user-pool-id us-east-2_n29sFim3E \
  --client-id 41td8cdvp4kbg1hkk8i7uclo3j \
  --query UserPoolClient.ClientSecret \
  --output text
```

For Codex MCP configuration with the public client, this command is still supported:

```bash
codex mcp add easycrm \
  --url https://d1vn7o33ycxs3a.cloudfront.net/mcp \
  --oauth-client-id 2jlsj51ac74hbrm1knkko83psg \
  --oauth-resource https://d1vn7o33ycxs3a.cloudfront.net/mcp
```

## Security Notes

Do not commit `.env`, Cognito client secrets, database passwords, AWS credentials, or generated tokens. Cognito, database, and MCP secrets are configured through AWS/CDK and AWS service-managed secret handling.
