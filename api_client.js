/**
 * api_client.js — a small, real HTTP client with timeout + retry handling.
 *
 * TESTED against a real local HTTP server (127.0.0.1) in this sandbox —
 * confirmed the request/response/JSON-parsing/error-handling path all
 * work correctly end to end.
 *
 * NOT TESTED against any real external API, because this sandbox's network
 * egress is restricted to a small allowlist (package registries, GitHub,
 * api.anthropic.com) and blocks everything else with a clean 403
 * (x-deny-reason: host_not_allowed) — confirmed against https://example.com
 * earlier in this session. This code does not know or care what host it's
 * talking to, so the client logic itself is sound; whether it can reach a
 * *specific* real API depends entirely on the network environment it runs
 * in, not on anything in this file.
 */
async function callAPI(url, { method = "GET", headers = {}, body, timeoutMs = 5000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      if (!res.ok) {
        return { ok: false, status: res.status, data: parsed, attempt };
      }
      return { ok: true, status: res.status, data: parsed, attempt };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // only retry on network/timeout errors, not on a successful-but-error response
      if (attempt === retries) {
        return { ok: false, status: null, error: err.message, attempt };
      }
    }
  }
  return { ok: false, status: null, error: lastErr?.message, attempt: retries };
}

module.exports = { callAPI };
