import express from "express";
import { ResendMailer } from "./resend-mailer.mjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6}$/;
const WINDOW_MS = 60_000;
const MAX_IP_REQUESTS = 5;

function retryAfter(entry, now) {
  return Math.max(1, Math.ceil((entry + WINDOW_MS - now) / 1000));
}

export function createMailApi(options = {}) {
  const app = express();
  const mailer = options.mailer ?? new ResendMailer();
  const clock = options.clock ?? (() => Date.now());
  const emailCooldowns = new Map();
  const ipWindows = new Map();
  const pruneRateState = (now) => {
    for (const [email, issuedAt] of emailCooldowns) {
      if (now - issuedAt >= WINDOW_MS) emailCooldowns.delete(email);
    }
    for (const [ip, stamps] of ipWindows) {
      const active = stamps.filter((stamp) => now - stamp < WINDOW_MS);
      if (active.length) ipWindows.set(ip, active);
      else ipWindows.delete(ip);
    }
  };

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

  app.get("/health", (_request, response) => response.status(mailer.configured ? 200 : 503).json({ status: mailer.configured ? "ok" : "not_configured" }));
  app.post("/v1/recovery-email", async (request, response) => {
    const to = typeof request.body?.to === "string" ? request.body.to.trim().toLowerCase() : "";
    const code = typeof request.body?.code === "string" ? request.body.code.trim().toUpperCase() : "";
    if (!EMAIL.test(to) || !CODE.test(code)) {
      response.status(400).json({ error: "恢复请求格式无效。" });
      return;
    }
    if (!mailer.configured) {
      response.status(503).json({ error: "中央邮件服务尚未配置。" });
      return;
    }

    const now = clock();
    pruneRateState(now);
    const emailLastSent = emailCooldowns.get(to);
    if (emailLastSent && now - emailLastSent < WINDOW_MS) {
      const seconds = retryAfter(emailLastSent, now);
      response.set("Retry-After", String(seconds));
      response.status(429).json({ error: `请在 ${seconds} 秒后重新发送。`, retryAfterSeconds: seconds });
      return;
    }

    const ip = request.ip || "unknown";
    const ipEntries = (ipWindows.get(ip) || []).filter((stamp) => now - stamp < WINDOW_MS);
    if (ipEntries.length >= MAX_IP_REQUESTS) {
      const seconds = retryAfter(ipEntries[0], now);
      response.set("Retry-After", String(seconds));
      response.status(429).json({ error: "当前网络请求过于频繁，请稍后重试。", retryAfterSeconds: seconds });
      return;
    }

    try {
      await mailer.sendRecoveryCode({ to, code });
      emailCooldowns.set(to, now);
      ipWindows.set(ip, [...ipEntries, now]);
      response.status(202).json({ accepted: true });
    } catch {
      response.status(503).json({ error: "中央邮件服务暂时无法投递验证码。" });
    }
  });

  return { app, dispose: async () => {} };
}
