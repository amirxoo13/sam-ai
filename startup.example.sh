#!/bin/sh
set -eu
cd "$(dirname "$0")"

# Copy to startup.sh and export real keys. Never commit secrets.
export HF_TOKEN="${HF_TOKEN:?set HF_TOKEN}"
export QWEN_API_KEY="${QWEN_API_KEY:?set QWEN_API_KEY}"
export QWEN_BASE_URL="${QWEN_BASE_URL:-https://dashscope-intl.aliyuncs.com/compatible-mode/v1}"
export QWEN_MODEL="${QWEN_MODEL:-qwen3.8-max}"
export EMBEDDING_MODEL="${EMBEDDING_MODEL:-intfloat/multilingual-e5-small}"
export EMBEDDING_DIM="${EMBEDDING_DIM:-384}"

node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
