import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const port = 3107;
const base = `http://127.0.0.1:${port}`;
const password = "test-only-password-never-deploy-123456";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, APP_USERNAME: "smoke", APP_PASSWORD: password, APP_ORIGIN: "https://scheduler.example", SESSION_KEY: "ab".repeat(32), PCO_CLIENT_ID: "", PCO_CLIENT_SECRET: "", PCO_ORGANIZATION_ID: "", PCO_USER_AGENT: "" },
  stdio: "ignore", windowsHide: true,
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited before readiness");
    try { await fetch(base, { signal: AbortSignal.timeout(1000) }); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
  }
  assert.ok(ready, "Server started");
  for (const path of ["/", "/api/planning-center?kind=services", "/api/auth/connect", "/api/auth/callback?code=bad&state=bad"]) {
    assert.equal((await fetch(base + path)).status, 401, `Unauthenticated ${path}`);
  }
  const headers = { authorization: `Basic ${Buffer.from(`smoke:${password}`).toString("base64")}` };
  const page = await fetch(base, { headers });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Drafts only/);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.equal((await fetch(base + "/api/planning-center?kind=services", { headers })).status, 401);
  assert.equal((await fetch(base + "/api/auth/connect", { headers })).status, 503);
  assert.equal((await fetch(base + "/api/planning-center/publish", { method:"POST", headers })).status, 403);
  assert.equal((await fetch(base + "/api/planning-center/publish", { method:"POST" })).status, 401);
  assert.equal((await fetch(base, { headers:{authorization:"Basic invalid"} })).status, 401);
  console.log("PASS: production page, API/OAuth gates, missing setup, invalid password and publish lock (no provider requests).");
} finally { server.kill(); }
