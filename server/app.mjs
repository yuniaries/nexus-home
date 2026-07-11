import { access } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { ConfigEventHub } from "./event-hub.mjs";
import { ConfigValidationError } from "./config-schema.mjs";
import { ConfigStore, RevisionConflictError } from "./config-store.mjs";
import { AuthStore } from "./auth-store.mjs";
import { hashPassword } from "./hash-password.mjs";
import { LoginRateLimiter, SessionManager } from "./sessions.mjs";

const JSON_LIMIT = "256kb";

function configEtag(config) {
  return `"rev-${config.revision}"`;
}

function parseExpectedRevision(request, body) {
  const ifMatch = request.get("if-match");
  if (!ifMatch || ifMatch === "*") {
    return Number.isSafeInteger(body?.revision) ? body.revision : undefined;
  }

  const match = /^(?:W\/)?"?(?:rev-)?(\d+)"?$/.exec(ifMatch.trim());
  if (!match) {
    const error = new Error("If-Match 必须包含有效的配置修订号。");
    error.status = 400;
    error.code = "INVALID_REVISION_HEADER";
    throw error;
  }

  const revision = Number(match[1]);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    const error = new Error("配置修订号超出有效范围。");
    error.status = 400;
    error.code = "INVALID_REVISION_HEADER";
    throw error;
  }
  return revision;
}

function isSameOrigin(request) {
  const origin = request.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.get("host");
  } catch {
    return false;
  }
}

function securityHeaders({ production }) {
  return (_request, response, next) => {
    response.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    if (production) {
      response.set(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; " +
          "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; " +
          "font-src 'self' data:; connect-src 'self'; form-action 'self'",
      );
    }
    next();
  };
}

async function attachFrontend(app, { rootDir, production, enableFrontend }) {
  if (!enableFrontend) return undefined;

  if (!production) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: rootDir,
      appType: "spa",
      configFile: false,
      optimizeDeps: {
        include: ["react", "react-dom/client", "lucide-react"],
      },
      esbuild: { jsx: "automatic" },
      resolve: { preserveSymlinks: true },
      server: { middlewareMode: true, hmr: false },
    });
    app.use(vite.middlewares);
    return vite;
  }

  const distDir = path.join(rootDir, "dist");
  const indexPath = path.join(distDir, "index.html");
  await access(indexPath);

  app.use(
    express.static(distDir, {
      index: false,
      etag: true,
      setHeaders(response, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.use((request, response, next) => {
    if (!(["GET", "HEAD"].includes(request.method) && request.accepts("html"))) return next();
    response.set("Cache-Control", "no-cache");
    response.sendFile(indexPath, (error) => {
      if (error) next(error);
    });
  });
  return undefined;
}

export async function createNexusApp(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const production = options.production ?? process.env.NODE_ENV === "production";
  const dataDir = path.resolve(options.dataDir ?? process.env.DATA_DIR ?? path.join(rootDir, "data"));
  const defaultPath = path.resolve(
    options.defaultPath ?? process.env.DEFAULT_CONFIG_PATH ?? path.join(rootDir, "config", "default.json"),
  );
  const configPath = path.resolve(
    options.configPath ?? process.env.CONFIG_PATH ?? path.join(dataDir, "config.json"),
  );
  const store =
    options.store ??
    new ConfigStore({
      defaultPath,
      configPath,
    });
  await store.init();

  const authStore =
    options.authStore ??
    new AuthStore({
      authPath: path.join(dataDir, "auth.json"),
    });
  await authStore.init();

  const environmentPassword = options.password ?? process.env.CONFIG_PASSWORD ?? "";
  const environmentPasswordHash = options.passwordHash ?? process.env.CONFIG_PASSWORD_HASH ?? "";
  const passwordConfigured = () => authStore.isConfigured() || Boolean(environmentPassword || environmentPasswordHash);

  const sessions =
    options.sessions ??
    new SessionManager({
      password: authStore.isConfigured() ? "" : environmentPassword,
      passwordHash: authStore.getPasswordHash() || environmentPasswordHash,
    });
  const loginLimiter = options.loginLimiter ?? new LoginRateLimiter();
  const events = options.events ?? new ConfigEventHub(options.eventOptions);
  const logger = options.logger ?? console;
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", options.trustProxy ?? process.env.TRUST_PROXY === "1");
  app.use(securityHeaders({ production }));
  app.use(
    "/api",
    express.json({
      limit: options.jsonLimit ?? JSON_LIMIT,
      strict: true,
      type: "application/json",
    }),
  );
  app.use("/api", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  const health = (_request, response) => {
    response.status(store.ready ? 200 : 503).json({
      status: store.ready ? "ok" : "not_ready",
      revision: store.ready ? store.get().revision : null,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  };
  app.get("/api/health", health);
  app.get("/api/health/live", (_request, response) => response.json({ status: "ok" }));
  app.get("/api/health/ready", health);

  app.get("/api/session", (request, response) => {
    response.json({
      setupRequired: !passwordConfigured(),
      passwordRequired: passwordConfigured(),
      recoveryRequired: authStore.hasRecovery(),
      recoveryQuestion: authStore.getRecoveryQuestion(),
      authenticated: sessions.authenticate(request),
    });
  });

  app.post("/api/session", async (request, response) => {
    if (!isSameOrigin(request)) {
      response.status(403).json({ code: "ORIGIN_MISMATCH", error: "请求来源不受信任。" });
      return;
    }

    const password = request.body?.password;
    if (typeof password !== "string" || !password) {
      response.status(400).json({ code: "PASSWORD_REQUIRED", error: "请输入密码。" });
      return;
    }

    const recoveryQuestion = request.body?.recoveryQuestion;
    const recoveryAnswer = request.body?.recoveryAnswer;

    const limiterKey = request.ip;
    const rate = loginLimiter.status(limiterKey);
    if (!rate.allowed) {
      response.set("Retry-After", String(rate.retryAfterSeconds));
      response.status(429).json({ code: "LOGIN_RATE_LIMIT", error: "尝试次数过多，请稍后再试。" });
      return;
    }

    if (!passwordConfigured()) {
      if (typeof recoveryQuestion !== "string" || !recoveryQuestion.trim()) {
        response.status(400).json({ code: "RECOVERY_QUESTION_REQUIRED", error: "请设置密保问题。" });
        return;
      }
      if (typeof recoveryAnswer !== "string" || !recoveryAnswer.trim()) {
        response.status(400).json({ code: "RECOVERY_ANSWER_REQUIRED", error: "请设置密保答案。" });
        return;
      }
      const passwordHash = hashPassword(password);
      const recoveryAnswerHash = hashPassword(recoveryAnswer.normalize("NFC").trim());
      await authStore.setCredentials({ passwordHash, recoveryQuestion, recoveryAnswerHash });
      sessions.setPasswordHash(passwordHash);
      loginLimiter.success(limiterKey);
      const session = sessions.create();
      response.set("Set-Cookie", sessions.cookie(session.token, request));
      response.json({
        passwordRequired: true,
          setupRequired: false,
        recoveryRequired: true,
        recoveryQuestion: authStore.getRecoveryQuestion(),
        authenticated: true,
        expiresAt: new Date(session.expiresAt).toISOString(),
      });
      return;
    }

    if (!sessions.verifyPassword(password)) {
      loginLimiter.failure(limiterKey);
      response.status(401).json({ code: "INVALID_CREDENTIALS", error: "密码不正确。" });
      return;
    }

    loginLimiter.success(limiterKey);
    const session = sessions.create();
    response.set("Set-Cookie", sessions.cookie(session.token, request));
    response.json({
      passwordRequired: true,
      setupRequired: false,
      recoveryRequired: authStore.hasRecovery(),
      recoveryQuestion: authStore.getRecoveryQuestion(),
      authenticated: true,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  app.post("/api/session/recover", async (request, response) => {
    if (!isSameOrigin(request)) {
      response.status(403).json({ code: "ORIGIN_MISMATCH", error: "请求来源不受信任。" });
      return;
    }
    if (!authStore.isConfigured() || !authStore.hasRecovery()) {
      response.status(409).json({ code: "RECOVERY_NOT_AVAILABLE", error: "当前未配置密保问题。" });
      return;
    }

    const recoveryAnswer = request.body?.recoveryAnswer;
    const newPassword = request.body?.newPassword;
    if (typeof recoveryAnswer !== "string" || !recoveryAnswer.trim()) {
      response.status(400).json({ code: "RECOVERY_ANSWER_REQUIRED", error: "请输入密保答案。" });
      return;
    }
    if (typeof newPassword !== "string" || !newPassword.trim()) {
      response.status(400).json({ code: "PASSWORD_REQUIRED", error: "请输入新密码。" });
      return;
    }

    const limiterKey = `${request.ip}:recover`;
    const rate = loginLimiter.status(limiterKey);
    if (!rate.allowed) {
      response.set("Retry-After", String(rate.retryAfterSeconds));
      response.status(429).json({ code: "LOGIN_RATE_LIMIT", error: "尝试次数过多，请稍后再试。" });
      return;
    }

    if (!authStore.verifyRecoveryAnswer(recoveryAnswer)) {
      loginLimiter.failure(limiterKey);
      response.status(401).json({ code: "INVALID_RECOVERY_ANSWER", error: "密保答案不正确。" });
      return;
    }

    const passwordHash = hashPassword(newPassword);
    await authStore.setCredentials({
      passwordHash,
      recoveryQuestion: authStore.getRecoveryQuestion(),
      recoveryAnswerHash: authStore.getRecoveryAnswerHash(),
    });
    sessions.clear();
    sessions.setPasswordHash(passwordHash);
    loginLimiter.success(limiterKey);
    const session = sessions.create();
    response.set("Set-Cookie", sessions.cookie(session.token, request));
    response.json({
      passwordRequired: true,
      setupRequired: false,
      recoveryRequired: true,
      recoveryQuestion: authStore.getRecoveryQuestion(),
      authenticated: true,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  app.delete("/api/session", (request, response) => {
    if (!isSameOrigin(request)) {
      response.status(403).json({ code: "ORIGIN_MISMATCH", error: "请求来源不受信任。" });
      return;
    }
    sessions.destroy(request);
    response.set("Set-Cookie", sessions.clearCookie(request));
    response.status(204).end();
  });

  app.get("/api/config", (request, response) => {
    const config = store.get();
    const etag = configEtag(config);
    response.set("ETag", etag);
    if (request.get("if-none-match") === etag) {
      response.status(304).end();
      return;
    }
    response.json(config);
  });

  app.put("/api/config", async (request, response) => {
    if (!request.is("application/json")) {
      response.status(415).json({ code: "JSON_REQUIRED", error: "配置更新必须使用 application/json。" });
      return;
    }
    if (!sessions.authenticate(request)) {
      response.status(401).json({ code: "AUTH_REQUIRED", error: "请先登录配置面板。" });
      return;
    }
    if (!isSameOrigin(request)) {
      response.status(403).json({ code: "ORIGIN_MISMATCH", error: "请求来源不受信任。" });
      return;
    }

    const expectedRevision = parseExpectedRevision(request, request.body);
    const result = await store.replace(request.body, { expectedRevision });
    response.set({
      ETag: configEtag(result.config),
      "X-Config-Changed": String(result.changed),
    });
    if (result.changed) events.publish(result.config);
    response.json(result.config);
  });

  app.get("/api/events", (request, response) => {
    events.connect(request, response, store.get());
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ code: "API_NOT_FOUND", error: "接口不存在。" });
  });

  let vite;
  try {
    vite = await attachFrontend(app, {
      rootDir,
      production,
      enableFrontend: options.enableFrontend ?? true,
    });
  } catch (error) {
    events.close();
    throw error;
  }

  if (!(options.enableFrontend ?? true)) {
    app.use((_request, response) => {
      response.status(404).json({ code: "NOT_FOUND", error: "资源不存在。" });
    });
  }

  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error instanceof ConfigValidationError) {
      response.status(422).json({
        code: "INVALID_CONFIG",
        error: "配置校验失败。",
        issues: error.issues,
      });
      return;
    }
    if (error instanceof RevisionConflictError) {
      response.status(409).json({
        code: "REVISION_CONFLICT",
        error: "配置已被其他页面更新，请刷新后重试。",
        expectedRevision: error.expectedRevision,
        actualRevision: error.actualRevision,
        config: store.get(),
      });
      return;
    }
    if (error?.type === "entity.too.large" || error?.status === 413) {
      response.status(413).json({ code: "BODY_TOO_LARGE", error: "请求内容超过允许大小。" });
      return;
    }
    if (error instanceof SyntaxError && error?.status === 400 && "body" in error) {
      response.status(400).json({ code: "INVALID_JSON", error: "请求正文不是有效 JSON。" });
      return;
    }
    if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
      response.status(error.status).json({ code: error.code ?? "BAD_REQUEST", error: error.message });
      return;
    }

    logger.error?.("Unhandled server error", error);
    response.status(500).json({ code: "INTERNAL_ERROR", error: "服务器处理请求时发生错误。" });
  });

  return {
    app,
    store,
    authStore,
    sessions,
    events,
    async dispose() {
      events.close();
      await vite?.close();
    },
  };
}
