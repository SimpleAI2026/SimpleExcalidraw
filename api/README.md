# AI proxy (BFF) — stub / guidance (P2.3 / B-02)

This CRA app has **no server runtime** in-repo (static Vercel deploy). A full SiliconFlow/OpenAI BFF is therefore out of band for a pure static build.

## Client hardening already done

- No `REACT_APP_AI_SECRET` default in the bundle
- API **secret is sessionStorage-only** (not localStorage); cleared when the tab closes
- Legacy plaintext secrets in `simpleexcalidraw_ai_settings` are migrated once then stripped
- Never log the secret

## Recommended production setup

1. Deploy a tiny HTTPS proxy you control (Cloudflare Worker, Vercel Edge/Serverless, nginx+lua, etc.).
2. Browser calls **your** origin only, e.g. `POST /api/ai/chat`.
3. Proxy attaches the provider key from **server env**; never expose it to the client.
4. In the AI modal, set API to your proxy URL and leave the client key empty (or use a user-owned key they paste themselves).

## Minimal request shape (compatible with current client)

The client posts OpenAI-compatible JSON to the configured endpoint:

```http
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer <user-or-empty>

{
  "model": "...",
  "messages": [{ "role": "user", "content": "..." }],
  "temperature": 0.2
}
```

Proxy should forward to the upstream provider and stream/return the same JSON shape.

## Optional next step

Add `api/ai-chat.ts` (Vercel serverless) or `worker.js` when you are ready to host a BFF; keep secrets in host env only.
