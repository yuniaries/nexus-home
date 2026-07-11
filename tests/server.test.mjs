import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createNexusApp } from "../server/app.mjs";

const silentLogger = { error() {} };

async function startFixture(t, { password = "", mailer } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "nexus-server-"));
  const defaultPath = path.join(directory, "default.json");
  const configPath = path.join(directory, "data", "config.json");
  await copyFile(new URL("../config/default.json", import.meta.url), defaultPath);

  const runtime = await createNexusApp({
    rootDir: path.resolve(fileURLToPath(new URL("..", import.meta.url))),
    defaultPath,
    configPath,
    dataDir: path.join(directory, "data"),
    password,
    mailer,
    enableFrontend: false,
    eventOptions: { heartbeatMs: 50 },
    logger: silentLogger,
  });
  const server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const abortControllers = [];

  t.after(async () => {
    for (const controller of abortControllers) controller.abort();
    await runtime.dispose();
    await new Promise((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });

  return {
    runtime,
    baseUrl,
    configPath,
    track(controller) {
      abortControllers.push(controller);
      return controller;
    },
  };
}

function cookieFrom(response) {
  const header = response.headers.get("set-cookie");
  assert.ok(header, "login response should set a session cookie");
  return header.split(";", 1)[0];
}

function createSseReader(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return async function nextConfig() {
    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let eventName = "message";
        const data = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (eventName === "config" && data.length > 0) return JSON.parse(data.join("\n"));
        continue;
      }

      const chunk = await reader.read();
      if (chunk.done) throw new Error("SSE stream ended before a config event arrived.");
      buffer += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n");
    }
  };
}

test("configuration API authenticates writes, validates input, persists, and broadcasts SSE", async (t) => {
  const fixture = await startFixture(t, { password: "correct horse battery staple" });

  const health = await fetch(`${fixture.baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  const getResponse = await fetch(`${fixture.baseUrl}/api/config`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers.get("cache-control"), "no-store");
  const initial = await getResponse.json();
  const initialEtag = getResponse.headers.get("etag");
  assert.equal(initialEtag, '"rev-1"');

  const cached = await fetch(`${fixture.baseUrl}/api/config`, {
    headers: { "If-None-Match": initialEtag },
  });
  assert.equal(cached.status, 304);

  const denied = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(initial),
  });
  assert.equal(denied.status, 401);

  const badLogin = await fetch(`${fixture.baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${fixture.baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "correct horse battery staple" }),
  });
  assert.equal(login.status, 200);
  const cookie = cookieFrom(login);

  const sessionStatus = await fetch(`${fixture.baseUrl}/api/session`, {
    headers: { Cookie: cookie },
  });
  assert.deepEqual(await sessionStatus.json(), {
    setupRequired: false,
    passwordRequired: true,
    recoveryRequired: false,
    recoveryMode: "",
    recoveryEmail: "",
    recoveryQuestion: "",
    authenticated: true,
  });

  const unsafe = structuredClone(initial);
  unsafe.links[0].url = "javascript:alert(1)";
  const invalidUpdate = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "If-Match": initialEtag,
    },
    body: JSON.stringify(unsafe),
  });
  assert.equal(invalidUpdate.status, 422);
  assert.equal((await invalidUpdate.json()).code, "INVALID_CONFIG");

  const controller = fixture.track(new AbortController());
  const timeout = setTimeout(() => controller.abort(), 3_000);
  timeout.unref?.();
  const streamResponse = await fetch(`${fixture.baseUrl}/api/events`, { signal: controller.signal });
  assert.equal(streamResponse.status, 200);
  assert.match(streamResponse.headers.get("content-type"), /^text\/event-stream/);
  const nextConfig = createSseReader(streamResponse);
  assert.equal((await nextConfig()).revision, 1);

  const candidate = structuredClone(initial);
  candidate.identity.brand = "NEXUS // LIVE TEST";
  const update = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "If-Match": initialEtag,
    },
    body: JSON.stringify(candidate),
  });
  assert.equal(update.status, 200);
  assert.equal(update.headers.get("etag"), '"rev-2"');
  assert.equal(update.headers.get("x-config-changed"), "true");
  const updated = await update.json();
  assert.equal(updated.revision, 2);
  assert.equal(updated.identity.brand, "NEXUS // LIVE TEST");

  const broadcast = await nextConfig();
  clearTimeout(timeout);
  assert.equal(broadcast.revision, 2);
  assert.equal(broadcast.identity.brand, "NEXUS // LIVE TEST");

  const persisted = JSON.parse(await readFile(fixture.configPath, "utf8"));
  assert.deepEqual(persisted, updated);

  const stale = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "If-Match": initialEtag,
    },
    body: JSON.stringify(initial),
  });
  assert.equal(stale.status, 409);
  const conflict = await stale.json();
  assert.equal(conflict.code, "REVISION_CONFLICT");
  assert.equal(conflict.actualRevision, 2);

  const foreignOrigin = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: "https://evil.example",
    },
    body: JSON.stringify(updated),
  });
  assert.equal(foreignOrigin.status, 403);

  const tooLarge = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ value: "x".repeat(300_000) }),
  });
  assert.equal(tooLarge.status, 413);

  const logout = await fetch(`${fixture.baseUrl}/api/session`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert.equal(logout.status, 204);
  controller.abort();
});

test("an unconfigured server requires first-time password setup before configuration writes", async (t) => {
  const fixture = await startFixture(t);
  const status = await fetch(`${fixture.baseUrl}/api/session`);
  assert.deepEqual(await status.json(), {
    setupRequired: true,
    passwordRequired: false,
    recoveryRequired: false,
    recoveryMode: "",
    recoveryEmail: "",
    recoveryQuestion: "",
    authenticated: false,
  });

  const initial = await (await fetch(`${fixture.baseUrl}/api/config`)).json();
  const candidate = structuredClone(initial);
  candidate.identity.name = "PUBLIC DEV MODE";
  const response = await fetch(`${fixture.baseUrl}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": '"rev-1"' },
    body: JSON.stringify(candidate),
  });
  assert.equal(response.status, 401);
});

test("first-time setup binds a recovery email and allows a verification-code password reset", async (t) => {
  const sentCodes = [];
  const fixture = await startFixture(t, { mailer: { sendRecoveryCode: async ({ code }) => sentCodes.push(code) } });
  const recoveryEmail = "recover@example.com";

  const setup = await fetch(`${fixture.baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "initial password", recoveryEmail }),
  });
  assert.equal(setup.status, 200);
  assert.equal((await setup.json()).recoveryEmail, recoveryEmail);

  const status = await fetch(`${fixture.baseUrl}/api/session`);
  assert.deepEqual(await status.json(), {
    setupRequired: false,
    passwordRequired: true,
    recoveryRequired: true,
    recoveryMode: "email",
    recoveryEmail,
    recoveryQuestion: "",
    authenticated: false,
  });

  const requestCode = await fetch(`${fixture.baseUrl}/api/session/recovery-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(requestCode.status, 200);
  assert.match(sentCodes[0], /^(?=.*[A-Z])(?=.*\d)[A-Z\d]{6}$/);

  const reset = await fetch(`${fixture.baseUrl}/api/session/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recoveryCode: sentCodes[0], newPassword: "new password" }),
  });
  assert.equal(reset.status, 200);
  const resetPayload = await reset.json();
  assert.equal(resetPayload.authenticated, true);
  assert.equal(resetPayload.recoveryEmail, recoveryEmail);

  const login = await fetch(`${fixture.baseUrl}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "new password" }),
  });
  assert.equal(login.status, 200);
});

async function startFrontendMode(t, production) {
  const directory = await mkdtemp(path.join(tmpdir(), `nexus-frontend-${production ? "prod" : "dev"}-`));
  const defaultPath = path.join(directory, "config", "default.json");
  const configPath = path.join(directory, "data", "config.json");
  await mkdir(path.dirname(defaultPath), { recursive: true });
  await copyFile(new URL("../config/default.json", import.meta.url), defaultPath);

  if (production) {
    await mkdir(path.join(directory, "dist", "assets"), { recursive: true });
    await writeFile(path.join(directory, "dist", "index.html"), "<!doctype html><h1>PRODUCTION SHELL</h1>");
    await writeFile(path.join(directory, "dist", "assets", "app.js"), "export default true;");
  } else {
    await writeFile(path.join(directory, "index.html"), "<!doctype html><h1>VITE MIDDLEWARE</h1>");
  }

  const runtime = await createNexusApp({
    rootDir: directory,
    defaultPath,
    configPath,
    production,
    logger: silentLogger,
  });
  const server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();

  t.after(async () => {
    await runtime.dispose();
    await new Promise((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${address.port}`;
}

test("development mode serves the SPA through embedded Vite middleware", async (t) => {
  const baseUrl = await startFrontendMode(t, false);
  const response = await fetch(`${baseUrl}/config`, { headers: { Accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /VITE MIDDLEWARE/);
});

test("production mode serves dist with SPA fallback and immutable hashed assets", async (t) => {
  const baseUrl = await startFrontendMode(t, true);
  const page = await fetch(`${baseUrl}/config`, { headers: { Accept: "text/html" } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /PRODUCTION SHELL/);
  assert.match(page.headers.get("content-security-policy"), /default-src 'self'/);

  const asset = await fetch(`${baseUrl}/assets/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("cache-control"), /immutable/);
});
