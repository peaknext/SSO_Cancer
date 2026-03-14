#!/bin/bash
# Creates sso-cancer-selector custom model on Ollama server via HTTP API
# Usage: bash deploy/ollama/create-model.sh [OLLAMA_URL] [OLLAMA_KEY]
#
# The custom model bakes in:
#   - Domain-specific SYSTEM prompt with protocol selection rules
#   - Optimized PARAMETERS (temperature=0.1, num_ctx=4096, etc.)
#
# Few-shot examples are injected API-side in ollama.provider.ts
# (Ollama v0.17+ /api/create doesn't support MESSAGE directives)

set -e

OLLAMA_URL="${1:-${OLLAMA_URL:-https://ollama.peaknext.cloud}}"
OLLAMA_KEY="${2:-${OLLAMA_KEY:-17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c}}"
MODEL_NAME="sso-cancer-selector"

echo "=== Creating Ollama custom model: $MODEL_NAME ==="
echo "Server: $OLLAMA_URL"

# Check server connectivity
echo "Checking server..."
VERSION=$(curl -sf -H "Authorization: Bearer $OLLAMA_KEY" "$OLLAMA_URL/api/version" 2>/dev/null || echo "FAIL")
if [ "$VERSION" = "FAIL" ]; then
  echo "ERROR: Cannot reach Ollama server at $OLLAMA_URL"
  exit 1
fi
echo "Server OK: $VERSION"

# Create model via structured API (Ollama v0.17+)
echo "Creating model '$MODEL_NAME'..."
RESULT=$(node -e "
const https = require('https');
const payload = JSON.stringify({
  name: '$MODEL_NAME',
  from: 'llama3.2',
  system: 'You select SSO cancer treatment protocols. Given cancer type, ICD-10 code, stage, medications, and ranked candidates, pick the best candidate ID. Rules: 1. Drug match is most important 2. Stage match matters - EARLY=curative/adjuvant, METASTATIC=palliative/first_line 3. Higher score = better match 4. Prefer preferred=YES 5. Return ONLY valid JSON',
  parameters: {
    temperature: 0.1,
    top_p: 0.9,
    num_predict: 256,
    num_ctx: 4096,
    repeat_penalty: 1.1,
    stop: ['<|eot_id|>']
  },
  stream: false
});
const url = new URL('$OLLAMA_URL/api/create');
const req = https.request({
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $OLLAMA_KEY',
  },
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log(data);
    process.exit(res.statusCode >= 400 ? 1 : 0);
  });
});
req.on('error', e => { console.error(e.message); process.exit(1); });
req.write(payload);
req.end();
") || {
  echo "ERROR: Model creation failed: $RESULT"
  exit 1
}

echo "Result: $RESULT"

# Verify model exists
echo ""
echo "Verifying model..."
MODELS=$(curl -sf -H "Authorization: Bearer $OLLAMA_KEY" "$OLLAMA_URL/api/tags" 2>/dev/null)
if echo "$MODELS" | grep -q "$MODEL_NAME"; then
  echo "SUCCESS: Model '$MODEL_NAME' is available"
else
  echo "WARNING: Model '$MODEL_NAME' not found in model list"
fi

echo ""
echo "=== Done ==="
echo "Next steps:"
echo "  1. Update ai_ollama_model setting to '$MODEL_NAME' in Settings > AI"
echo "  2. Restart API: pm2 restart sso-cancer-api"
