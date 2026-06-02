# Repository Guidelines

## Project Structure & Module Organization

This is an npm workspace monorepo for Easy CRM.

- `frontend/`: Vite + React SPA using Cognito OIDC login. Source lives in `frontend/src/`; build output goes to `frontend/dist/`.
- `backend/`: Express REST API. Source is in `backend/src/`; Vitest tests are in `backend/tests/`.
- `mcp-server/`: Node.js MCP server for CRM tools. Source is in `mcp-server/src/`; tests are in `mcp-server/tests/`.
- `database/migrations/`: PostgreSQL/Aurora schema migrations.
- `infra/`: AWS CDK TypeScript stack.
- `scripts/`: local startup, deploy, and destroy scripts.

## Build, Test, and Development Commands

- `npm run install:all`: install root and workspace dependencies.
- `./scripts/local-up.sh`: start local Docker-based services and app components.
- `npm test`: run backend and MCP Vitest suites.
- `npm run lint`: run ESLint for frontend, backend, and MCP workspaces.
- `npm run build`: build frontend, check backend/MCP syntax, and compile CDK.
- `npm run synth --workspace infra`: synthesize the CDK stack; build `frontend/dist` first.
- `AWS_REGION=us-east-2 ./scripts/deploy.sh`: deploy the current stack to AWS.

## Coding Style & Naming Conventions

Use ES modules across JavaScript workspaces. Follow the existing style: 2-space indentation, semicolons, single quotes, and descriptive camelCase identifiers. React components use PascalCase filenames/functions such as `App.jsx`. Keep shared behavior in local modules instead of duplicating request, validation, or database logic.

## Testing Guidelines

Backend and MCP tests use Vitest. Put tests under `tests/` and name them `*.test.js`. Add or update tests for validation, authentication, migrations, API behavior, and MCP tool formatting when those areas change. Run `npm test` before deployment or PR submission.

## Commit & Pull Request Guidelines

This repository currently has no commit history to infer conventions from. Use concise imperative commit messages, for example `Add migration retry tests` or `Proxy API through CloudFront`. PRs should include a summary, verification commands run, deployment impact, linked issues when applicable, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit `.env`, credentials, tokens, or generated secrets. Cognito, database, and MCP secrets are configured through AWS/CDK and Secrets Manager. Never use `AUTH_DISABLED=true` outside local debugging. Treat deployed resources in `us-east-2` as live demo infrastructure.
