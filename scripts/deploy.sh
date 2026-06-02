#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

AWS_REGION="${AWS_REGION:-${CDK_DEFAULT_REGION:-us-east-1}}"
export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"
export CDK_DEFAULT_REGION="$AWS_REGION"
AWS_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

npm install --workspaces --include-workspace-root
npm run build --workspace frontend
npm run build --workspace backend
npm run build --workspace mcp-server
npm run build --workspace infra

cd "$ROOT_DIR/infra"
npx cdk bootstrap "aws://${AWS_ACCOUNT}/${AWS_REGION}"
npx cdk deploy --require-approval never "$@"
