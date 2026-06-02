# Easy CRM

一个简单但可运行的 CRM 管理系统，包含 Vite + React 前端、Express REST API、PostgreSQL/Aurora 兼容 schema、独立 MCP Server、Docker 本地环境和 AWS CDK 基础设施。提供OAuth 2.1 认证的remote MCP 服务，用于与Agent对接测试。

## 架构图
![alt text](assets/aws-high-level-architecture.png)


## 项目结构

- `frontend/`：Vite + React JavaScript SPA，使用 Cognito OIDC Authorization Code + PKCE 登录。
- `backend/`：Express REST API，校验 Cognito JWT，连接 PostgreSQL/Aurora。
- `mcp-server/`：Node.js MCP Server，使用 `@modelcontextprotocol/sdk`，支持 `stdio` 和 Streamable HTTP。
- `database/migrations/`：Aurora PostgreSQL 兼容初始化 schema。
- `infra/`：AWS CDK TypeScript，一键创建 VPC、ECS、Aurora、Cognito、Secrets、S3、CloudFront。
- `scripts/`：本地启动、部署、销毁脚本。

## 前置条件

本地开发需要 Node.js 22、Docker、Docker Compose。部署到 AWS 需要 AWS CLI、AWS CDK、Docker、有效 AWS credentials，以及目标 region 的权限。

## 本地启动

1. 准备环境变量：

```bash
cp .env.example .env
```

2. 填写 `.env` 中的 Cognito 值：

- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`

可以先用 `scripts/deploy.sh` 创建默认 Cognito，再把 CDK 输出填回本地 `.env`。本地数据库由 PostgreSQL 容器提供，schema 会通过 `database/migrations/001_init.sql` 初始化。

3. 启动：

```bash
./scripts/local-up.sh
```

访问：

- 前端：http://localhost:5173
- API health：http://localhost:4000/health
- MCP HTTP health：http://localhost:4111/health
- PostgreSQL：`localhost:5432`

受保护 API 默认会拒绝缺失或无效 JWT。只做 API 调试时可以临时设置 `AUTH_DISABLED=true`，不要在生产环境使用。

## REST API

所有业务接口都在 `/api` 下，需要 `Authorization: Bearer <Cognito access token>`。

- `GET/POST /api/customers`
- `GET/PUT/DELETE /api/customers/:id`
- `GET/POST /api/contacts`
- `GET/PUT/DELETE /api/contacts/:id`
- `GET/POST /api/deals`
- `GET/PUT/DELETE /api/deals/:id`
- `GET /api/dashboard`

客户支持 `?search=`，联系人支持 `?customerId=`，销售机会支持 `?customerId=` 和 `?stage=`。

## MCP Server

本地 stdio 模式适合 Codex CLI 或其他本地 MCP Client：

```bash
cd mcp-server
npm install
MCP_TRANSPORT=stdio \
MCP_SERVICE_TOKEN=replace_with_local_service_token \
DATABASE_URL=postgres://crm:crm_dev_password@localhost:5432/easy_crm \
npm start
```

示例 client 配置在 `mcp-server/mcp-client.example.json`。把 `args` 中路径替换成当前仓库的绝对路径。

HTTP 模式适合本地或 ECS HTTP 访问：

```bash
MCP_TRANSPORT=http \
MCP_PORT=4111 \
AWS_REGION=us-east-2 \
COGNITO_USER_POOL_ID=us-east-2_example \
COGNITO_CLIENT_ID=exampleclientid \
DATABASE_URL=postgres://... \
npm start
```

HTTP 调用 `/mcp` 必须带 `Authorization: Bearer <Cognito access token>`。生产部署中 MCP 通过 public ALB 承载，但对外推荐统一使用 CloudFront 路径 `https://<FrontendUrl>/mcp`；`/health` 保持公开用于负载均衡健康检查。

HTTP MCP 还支持 MCP Authorization spec 的 OAuth 2.1 Resource Server discovery：

- 未授权访问 `/mcp` 会返回 `401` 和 `WWW-Authenticate: Bearer ... resource_metadata="https://<FrontendUrl>/.well-known/oauth-protected-resource/mcp"`。
- `GET /.well-known/oauth-protected-resource/mcp` 返回 RFC 9728 Protected Resource Metadata，其中 `authorization_servers` 指向 Cognito issuer。
- MCP client 可继续读取 Cognito OIDC/AS metadata，并使用 Authorization Code + PKCE 登录获取 access token。

Cognito 不支持 Dynamic Client Registration；客户端需要使用 CDK 输出的 `CognitoAppClientId`，并且 redirect URI 必须预先登记在 Cognito app client 中。Codex CLI 可使用 `mcp_oauth_callback_url = "http://localhost:5555/callback"`；对应的 Cognito callback URL 是 `http://localhost:5555/callback/zJW_9JhwgoXA`。

### Codex CLI MCP 配置

先在 `~/.codex/config.toml` 顶层固定 OAuth callback：

```toml
mcp_oauth_callback_port = 5555
mcp_oauth_callback_url = "http://localhost:5555/callback"
```

然后添加 remote MCP server：

```bash
MCP_ENDPOINT="<McpEndpoint>"
COGNITO_APP_CLIENT_ID="<CognitoAppClientId>"

codex mcp remove easycrm
codex mcp add easycrm \
  --url "$MCP_ENDPOINT" \
  --oauth-client-id "$COGNITO_APP_CLIENT_ID" \
  --oauth-resource "$MCP_ENDPOINT"
```

部署后可从 CloudFormation outputs 获取真实值：

```bash
aws cloudformation describe-stacks \
  --stack-name EasyCrmStack \
  --region <AWS_REGION> \
  --query 'Stacks[0].Outputs[?OutputKey==`McpEndpoint` || OutputKey==`CognitoAppClientId`].[OutputKey,OutputValue]' \
  --output table
```

登录授权：

```bash
codex mcp login easycrm --scopes openid,email,profile
```

登录会打开 Cognito Hosted UI。授权成功后启动 Codex，并在 TUI 中运行 `/mcp` 检查 `easycrm` 工具是否可用。如果在远程 SSH 主机上运行 Codex CLI，需要确保浏览器能回调到该主机的 `localhost:5555`，通常需要 SSH 端口转发。

MCP tools：

- `list_customers`
- `get_customer`
- `create_customer`
- `update_customer`
- `list_contacts`
- `create_contact`
- `list_deals`
- `create_deal`
- `get_dashboard_summary`

### 需要 Client Secret 的 MCP OAuth 配置

CDK 会创建两个 Cognito app client：

- `CognitoAppClientId`：给 Web SPA/Codex 等 public OAuth client 使用，不生成 client secret。
- `CognitoMcpAppClientId`：给 QuickSight、Q Apps 或其他要求填写 `Client ID`、`Client secret`、`Token URL` 的 OAuth client 使用，会生成 client secret。

当前 Cognito domain 使用 newer managed login，并把 `McpEndpoint` 注册为 Cognito resource server。Amazon Quick 会使用 RFC 8707 Resource Indicators 请求 resource-bound access token，token 中的 `aud` 应该等于 MCP resource URL。

部署时如果外部 client 提供了固定 callback/redirect URL，需要通过 `McpOAuthCallbackUrls` 参数传入。该参数是逗号分隔列表：

```bash
AWS_REGION=us-east-2 ./scripts/deploy.sh \
  --parameters McpOAuthCallbackUrls='https://us-east-1.quicksight.aws.amazon.com/sn/account/anycompany-digital/oauthcallback,https://us-east-1.quicksight.aws.amazon.com/sn/oauthcallback,http://localhost:5555/callback/zJW_9JhwgoXA'
```

当前 `us-east-2` 部署中，QuickSight/MCP OAuth 配置如下：

- `Client ID`：`41td8cdvp4kbg1hkk8i7uclo3j`
- `Client secret`：运行下面的 AWS CLI 命令获取，不要提交到代码库
- `Token URL`：`https://easy-crm-c8cdd506.auth.us-east-2.amazoncognito.com/oauth2/token`
- `Authorization URL`：`https://easy-crm-c8cdd506.auth.us-east-2.amazoncognito.com/oauth2/authorize`
- `Scopes`：`openid email profile`
- `Resource URL`：`https://d1vn7o33ycxs3a.cloudfront.net/mcp`
- `Resource server identifier`：`https://d1vn7o33ycxs3a.cloudfront.net/mcp`
- `Callback URLs`：`https://us-east-1.quicksight.aws.amazon.com/sn/account/anycompany-digital/oauthcallback`、`https://us-east-1.quicksight.aws.amazon.com/sn/oauthcallback`、`http://localhost:5555/callback/zJW_9JhwgoXA`

获取当前 MCP confidential client secret：

```bash
aws cognito-idp describe-user-pool-client \
  --region us-east-2 \
  --user-pool-id us-east-2_n29sFim3E \
  --client-id 41td8cdvp4kbg1hkk8i7uclo3j \
  --query UserPoolClient.ClientSecret \
  --output text
```

QuickSight 登录时使用的是 Cognito User Pool `us-east-2_n29sFim3E` 中的用户，不是 AWS Console 或 QuickSight 自身的密码。比如已确认用户 `testuser-1780383026` 处于 `CONFIRMED` 且 `Enabled=true`，可用于 MCP OAuth 登录。

## AWS 一键部署

默认部署会创建 demo 环境：VPC、公私子网、ECS Cluster、API Fargate Service、MCP Fargate Service、public API ALB、public MCP ALB、Aurora PostgreSQL Serverless v2、Cognito User Pool、Hosted UI domain、Secrets Manager、S3 + CloudFront 前端。CloudFront 同时代理 `/api/*` 和 `/mcp`。

```bash
export AWS_REGION=us-east-2
./scripts/deploy.sh
```

如果 Cognito Hosted UI domain prefix 与现有资源冲突，可以传 CDK 参数：

```bash
./scripts/deploy.sh --parameters CognitoDomainPrefix=my-unique-crm-prefix
```

部署输出包括：

- `FrontendUrl`
- `BackendApiUrl`
- `CognitoUserPoolId`
- `CognitoAppClientId`
- `CognitoMcpAppClientId`
- `CognitoHostedUiDomain`
- `CognitoMcpAuthorizeUrl`
- `CognitoMcpTokenUrl`
- `CognitoMcpResourceServerIdentifier`
- `CognitoMcpClientSecretCommand`
- `McpEndpoint`
- `McpPublicAlbEndpoint`
- `AuroraEndpoint`
- `DatabaseSecretArn`

部署后在 Cognito User Pool 中创建用户，使用 `FrontendUrl` 登录。

销毁：

```bash
./scripts/destroy.sh
```

## 生产安全事项

当前 CDK 偏 demo 成本和可运行性。生产环境应补充 HTTPS 自定义域名、ACM 证书、WAF、严格 CORS、Secrets rotation、Aurora backup/retention 策略、删除保护、最小权限 IAM、私有 API 或 CloudFront/API Gateway 前置、ECS autoscaling、审计日志，以及 MCP Server 的私网访问控制和更细粒度授权。

## 常用检查

```bash
npm install --workspaces --include-workspace-root
npm test
npm run lint
npm run build
npm run synth --workspace infra
```

`cdk synth` 需要先构建 `frontend/dist`，因为 CDK 会把静态构建产物部署到 S3。
