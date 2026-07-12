import express from "express";
import { ResendMailer } from "./resend-mailer.mjs";
import { RedisRecoveryStore } from "./central-recovery-store.mjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6}$/;
const SCOPE = /^[a-zA-Z0-9-]{16,128}$/;

export function createMailApi(options = {}) {
  const app = express();
  const mailer = options.mailer ?? new ResendMailer();
  const recoveryStore = options.recoveryStore ?? new RedisRecoveryStore(options.redisOptions);

  app.disable("x-powered-by");
  app.set("trust proxy", options.trustProxy ?? process.env.TRUST_PROXY === "1");
  app.use(express.json({ limit: "8kb", strict: true, type: "application/json" }));
  app.use((_request, response, next) => {
    response.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    next();
  });

  app.get("/health", async (_request, response) => {
    if (!mailer.configured || !recoveryStore.configured) return response.status(503).json({ status: "not_configured" });
    try {
      await recoveryStore.ping?.();
      return response.json({ status: "ok" });
    } catch {
      return response.status(503).json({ status: "redis_unavailable" });
    }
  });
  app.get("/v1/recovery-status", async (request, response) => {
    const to = typeof request.query?.email === "string" ? request.query.email.trim().toLowerCase() : "";
    const scope = typeof request.query?.scope === "string" ? request.query.scope.trim() : "";
    if (!EMAIL.test(to) || !SCOPE.test(scope)) return response.status(400).json({ error: "恢复请求格式无效。" });
    try { return response.json(await recoveryStore.status({ scope, email: to })); }
    catch { return response.status(503).json({ error: "中央恢复服务暂时不可用。" }); }
  });
  app.post("/v1/recovery-email", async (request, response) => {
    const to = typeof request.body?.to === "string" ? request.body.to.trim().toLowerCase() : "";
    const scope = typeof request.body?.scope === "string" ? request.body.scope.trim() : "";
    const action = typeof request.body?.action === "string" ? request.body.action : "issue";
    if (action === "status") {
      if (!EMAIL.test(to) || !SCOPE.test(scope)) return response.status(400).json({ error: "恢复请求格式无效。" });
      try { return response.json(await recoveryStore.status({ scope, email: to })); }
      catch { return response.status(503).json({ error: "中央恢复服务暂时不可用。" }); }
    }
    if (action === "verify") {
      const code = typeof request.body?.code === "string" ? request.body.code.trim().toUpperCase() : "";
      if (!EMAIL.test(to) || !SCOPE.test(scope) || !CODE.test(code)) return response.status(400).json({ error: "验证码格式无效。" });
      try {
        const result = await recoveryStore.verify({ scope, email: to, code });
        return response.status(result.valid ? 200 : 401).json({ verified: result.valid, error: result.valid ? undefined : result.exhausted ? "验证码尝试次数过多，请重新获取。" : "验证码不正确或已过期。" });
      } catch {
        return response.status(503).json({ error: "中央恢复服务暂时不可用。" });
      }
    }
    if (action !== "issue") return response.status(400).json({ error: "恢复请求格式无效。" });
    if (!EMAIL.test(to) || !SCOPE.test(scope)) {
      response.status(400).json({ error: "恢复请求格式无效。" });
      return;
    }
    if (!mailer.configured) {
      response.status(503).json({ error: "中央邮件服务尚未配置。" });
      return;
    }

    const ip = request.ip || "unknown";
    let issued;
    try {
      const ipRate = await recoveryStore.consumeIp(ip);
      if (!ipRate.allowed) {
        response.set("Retry-After", String(ipRate.retryAfterSeconds));
        return response.status(429).json({ error: "当前网络请求过于频繁，请稍后重试。", retryAfterSeconds: ipRate.retryAfterSeconds });
      }
      issued = await recoveryStore.issue({ scope, email: to });
      if (!issued.allowed) {
        response.set("Retry-After", String(issued.retryAfterSeconds));
        return response.status(429).json({ error: `请在 ${issued.retryAfterSeconds} 秒后重新发送。`, retryAfterSeconds: issued.retryAfterSeconds });
      }
      await mailer.sendRecoveryCode({ to, code: issued.code });
      return response.status(202).json({ accepted: true, expiresAt: issued.expiresAt, retryAfterSeconds: issued.retryAfterSeconds });
    } catch {
      if (issued?.allowed) await recoveryStore.clear({ scope, email: to }).catch(() => {});
      return response.status(503).json({ error: "中央邮件服务暂时无法投递验证码。" });
    }
  });

  app.post("/v1/recovery-email/verify", async (request, response) => {
    const to = typeof request.body?.to === "string" ? request.body.to.trim().toLowerCase() : "";
    const scope = typeof request.body?.scope === "string" ? request.body.scope.trim() : "";
    const code = typeof request.body?.code === "string" ? request.body.code.trim().toUpperCase() : "";
    if (!EMAIL.test(to) || !SCOPE.test(scope) || !CODE.test(code)) return response.status(400).json({ error: "验证码格式无效。" });
    try {
      const result = await recoveryStore.verify({ scope, email: to, code });
      return response.status(result.valid ? 200 : 401).json({ verified: result.valid, error: result.valid ? undefined : result.exhausted ? "验证码尝试次数过多，请重新获取。" : "验证码不正确或已过期。" });
    } catch {
      return response.status(503).json({ error: "中央恢复服务暂时不可用。" });
    }
  });

  return { app, dispose: async () => recoveryStore.close?.() };
}
