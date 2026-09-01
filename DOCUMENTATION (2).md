# Automation Toolkit — Documentation

Everything below is written from what was actually built and run today
(2026-09-01, Node v22.22.2, this sandbox). Where something is a
recommendation rather than a tested fact, it's labeled as such. Nothing
here is a projected capability dressed up as a confirmed one.

---

## 1. Architecture — the one fact everything else depends on

This toolkit has two separate halves that **cannot merge into one script**,
and pretending otherwise is the single most common way a project like this
goes wrong:

- **The MCP/tool-calling half** happens in a Claude conversation. Only
  Claude can call alphaXiv, Scholar Gateway, Apollo, or any other MCP
  server — it requires the MCP protocol layer and credentials that no
  sandboxed script has access to.
- **The local pipeline half** (everything in `src/`) is ordinary Node code.
  It has no access to MCP tools, and MCP tools have no access to it.

The bridge between them is a file: Claude calls a tool, serializes the
result to JSON, and this pipeline ingests that JSON like it would ingest
any other data. `src/mcp_ingest.js` is that bridge, tested today with real
output from an earlier `alphaXiv:discover_papers` call (10 real papers,
not fabricated for this test).

**Do not build toward a script that "calls MCP tools automatically."**
That's not a hard problem to solve with more code — it's not how the
architecture works, full stop.

---

## 2. Components — what's real, with the actual evidence

| Component | What it does | Verified how |
|---|---|---|
| `dom_automation.js` | Loads HTML, runs its real JS, fills/clicks/submits, extracts tables & lists | 4-step form validation (3 failure paths + 1 success) proven to depend on real page-JS evaluation, not scripted output; table/list extraction matched a fixture exactly |
| `db.js` | SQLite storage (`node:sqlite`, built into Node 22, marked experimental) | Round-tripped nested JSON + timestamps, read back and matched exactly |
| `api_client.js` | HTTP client with timeout + retry | 4 real cases run: success (200), HTTP error (500), unreachable host (retries then fails cleanly), blocked external host (surfaces the sandbox's real 403 instead of crashing) |
| `mcp_ingest.js` | Loads a JSON file (shaped like real MCP tool output) into the database | Ingested 10 real, previously-captured alphaXiv records; independently re-queried to confirm they landed correctly |
| `build_dashboard.js` | Generates a single self-contained HTML file from whatever's in the database | Row count and cell content independently re-verified via a second script reading the generated HTML, not just trusting the generator's own success message |
| `orchestrate.js` | Runs the whole pipeline together: extract → ingest → build → verify | 3 extracted + 10 ingested = 13 in DB = 13 on dashboard, checked programmatically |

---

## 3. What we can genuinely do better

Ranked by how confident I actually am each one is worth it, not by how
impressive it sounds:

1. **Point the dashboard at real page rendering, outside this sandbox.**
   Everything here was verified structurally (via jsdom) — row counts,
   cell content — but never *visually* (no CSS layout, no real paint).
   If you open `dashboard/index.html` in an actual browser, that's the
   first real visual check it's ever gotten. Worth doing before trusting
   the styling.
2. **Add a dedupe key to `mcp_ingest.js`.** Right now, re-running ingest
   on the same source file creates duplicate rows (I had to manually
   delete `toolkit.db` before the orchestrated run to get a clean count).
   A real system needs a stable key per record (e.g. `source + step`)
   with an upsert, not a blind insert. This is a real gap I hit directly
   while building this, not a hypothetical one.
3. **Extend `api_client.js` with a rate limiter**, if it's ever going to
   sit in front of a real external API with usage limits. Not built,
   because there was nothing real to rate-limit against here — but it's
   a small, well-understood addition when there is.
4. **Run this same toolkit somewhere with real network access** (your own
   machine, a CI runner, Claude Code with a real environment) to see
   whether `api_client.js` and a real browser-automation library
   (Playwright, since that's a known-good one from the earlier audit)
   can be used together — that combination was never testable here for
   pure infrastructure reasons, not because the code is wrong.
5. **Swap `node:sqlite` for `better-sqlite3` if you need this on an older
   Node version** — `node:sqlite` is explicitly experimental and only
   confirmed working on v22.22.2 here. Fine for now, worth flagging
   before this becomes load-bearing somewhere else.

---

## 4. What we should NOT do — and specifically why

This is the part actually worth remembering, because each of these was
tested, not assumed:

- **Do not attempt real browser automation (Playwright/Puppeteer) inside
  this sandbox.** Three independent paths were tried and all failed for
  structural reasons: Playwright's CDN is not on the network allowlist,
  Ubuntu's `chromium-browser` package is a stub that redirects to Snap,
  and `chromium` proper has no installable candidate at all. This is not
  a "try a different flag" problem.
- **Do not write code that assumes arbitrary internet access from this
  environment.** Confirmed via direct test: any host outside a short
  allowlist (package registries, GitHub, api.anthropic.com) gets a clean
  403 with `x-deny-reason: host_not_allowed`. `api_client.js` handles
  this correctly when it happens — but the fix is "run this pipeline
  somewhere with real network access," not "find a workaround here."
- **Do not treat a jsdom-verified dashboard as visually verified.** It's
  real proof the *data and structure* are correct. It is not proof the
  page looks right. Conflating the two is exactly the mistake this
  project was trying to avoid from the start.
- **Do not assume a script running in this sandbox can call MCP tools
  directly**, no matter how the code is structured. Covered in Section 1,
  repeated here because it's the mistake most likely to resurface.
- **Do not trust a single MCP-server search result as canonical**, based
  directly on this session's earlier finding: "SEC EDGAR MCP" turned out
  to be at least 7 unrelated implementations sharing a name. The same
  caution applies to anything this toolkit ingests from a tool search —
  verify the specific source, not the category name.

---

## 5. Files in this delivery

```
automation_toolkit/
├── src/
│   ├── dom_automation.js   form/DOM automation + table/list extraction
│   ├── db.js               SQLite results store
│   ├── api_client.js       HTTP client with retry/error handling
│   ├── mcp_ingest.js       MCP-result-to-pipeline bridge
│   └── build_dashboard.js  dashboard generator
├── fixtures/
│   ├── signup.html         form-validation test page
│   ├── data_table.html     table/list extraction test page
│   └── mcp_result_example.json   real captured alphaXiv output, reused as fixture
├── orchestrate.js          full pipeline, run end to end
├── dashboard/index.html    generated output (not visually verified — see §3.1)
└── data/toolkit.db         generated output
```
