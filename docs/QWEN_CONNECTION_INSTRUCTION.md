# SSO Cancer Selector — API Access

## Live Endpoint

```
https://ollama.peaknext.cloud
```

**API Key:**

```
f3480b805a7371303b80623b29fd65123e4c32e6eadb4a46039ccc92fff6cf51
```

All requests require the `Authorization: Bearer <key>` header. Requests without a valid key return `401 Unauthorized`.

## Quick Test

```bash
# List models
curl -s https://ollama.peaknext.cloud/api/tags \
  -H "Authorization: Bearer f3480b805a7371303b80623b29fd65123e4c32e6eadb4a46039ccc92fff6cf51"

# Run inference
curl -s https://ollama.peaknext.cloud/api/chat \
  -H "Authorization: Bearer f3480b805a7371303b80623b29fd65123e4c32e6eadb4a46039ccc92fff6cf51" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sso-cancer-selector",
    "messages": [{"role":"user","content":"Cancer: Breast\nICD-10: C50.9\nStage: EARLY\nMeds: doxorubicin, cyclophosphamide\n\nCandidates:\n1. ID=1 C0111 type=CHEMOTHERAPY intent=CURATIVE stageMatch=YES regime>
    "format": "json",
    "stream": false
  }'
```

## API Usage Reference

### Endpoint

```
POST /api/chat
```

### Request body

```json
{
  "model": "sso-cancer-selector",
  "messages": [
    {
      "role": "user",
      "content": "Cancer: <type>\nICD-10: <code>\nStage: <EARLY|METASTATIC>\nMeds: <drug1, drug2, ...>\n\nCandidates:\n1. ID=<id> <code> type=<type> intent=<intent> stageMatch=<YES|NO> regimen=<name>(ID=<id>) >
    }
  ],
  "format": "json",
  "stream": false
}
```

### Response fields

| Field                     | Type   | Description                           |
| ------------------------- | ------ | ------------------------------------- |
| `recommendedProtocolCode` | string | Selected protocol code (e.g. "C0111") |
| `recommendedProtocolId`   | number | Selected protocol ID                  |
| `recommendedRegimenCode`  | string | Selected regimen code (e.g. "AC")     |
| `recommendedRegimenId`    | number | Selected regimen ID                   |
| `confidenceScore`         | number | Confidence score (0-100)              |
| `reasoning`               | string | Clinical reasoning in Thai            |
| `alternativeProtocols`    | array  | Other considered protocols            |
| `clinicalNotes`           | string | Additional clinical notes in Thai     |

### Performance expectations

- Response time: ~60 seconds on this 2 vCPU server
- Concurrent requests: 1 at a time recommended (sequential queue)
- Model stays loaded in RAM after first request; cold start adds ~15 seconds

## Infrastructure Details

| Component     | Details                                                     |
| ------------- | ----------------------------------------------------------- |
| Server IP     | 72.62.121.223                                               |
| Domain        | ollama.peaknext.cloud (DNS-only, no Cloudflare proxy)       |
| SSL           | Let's Encrypt, auto-renews (expires 2026-06-12)             |
| Reverse proxy | Nginx on port 443, proxies to Ollama on 127.0.0.1:11434     |
| Firewall      | UFW — ports 22, 80, 443 open; port 11434 blocked externally |
| Nginx config  | /etc/nginx/sites-available/ollama                           |

### Key nginx notes

- `proxy_set_header Host localhost` is required — Ollama v0.18.0 rejects non-localhost Host headers
- Proxy timeouts set to 300s to accommodate slow inference on 2 vCPU
