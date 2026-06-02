#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

AWS_REGION="${AWS_REGION:-${CDK_DEFAULT_REGION:-us-east-1}}"
export AWS_REGION
export AWS_DEFAULT_REGION="$AWS_REGION"
export CDK_DEFAULT_REGION="$AWS_REGION"

npm install --workspaces --include-workspace-root
cd "$ROOT_DIR/infra"
npx cdk destroy "$@"
