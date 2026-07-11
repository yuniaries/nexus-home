import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "nexus_session";
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function parseScryptHash(value) {
  if (!value) return undefined;
  const [algorithm, saltText, digestText] = value.split("$");
  if (algorithm !== "scrypt" || !saltText || !digestText) throw new Error("CONFIG_PASSWORD_HASH 格式无效。");
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(digestText, "base64url");
  if (salt.length < 16 || expected.length < 32) throw new Error("CONFIG_PASSWORD_HASH 格式无效。");
  return { salt, expected };
}

function parseCookies(header) {
  const result = new Map();
  if (typeof header !== "string" || header.length > 8192) return result;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value) result.set(name, value);
  }
  return result;
}

export class LoginRateLimiter {
  constructor({ maxAttempts = 5, windowMs = 10 * 60 * 1000, maxEntries = 2048, clock = () => Date.now() } = {}) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.clock = clock;
    this.attempts = new Map();
  }

  prune() {
    const now = this.clock();
    for (const [key, value] of this.attempts) {
      if (value.resetAt <= now) this.attempts.delete(key);
    }
    while (this.attempts.size >= this.maxEntries) {
      this.attempts.delete(this.attempts.keys().next().value);
    }
  }

  status(key) {
    this.prune();
    const now = this.clock();
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count < this.maxAttempts) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  failure(key) {
    this.prune();
    const now = this.clock();
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    current.count += 1;
  }

  success(key) {
    this.attempts.delete(key);
  }
}

export class SessionManager {
  constructor({ password = "", passwordHash = "", ttlMs = DEFAULT_SESSION_TTL_MS, clock = () => Date.now() } = {}) {
    this.password = typeof password === "string" ? password : "";
    this.passwordHash = parseScryptHash(typeof passwordHash === "string" ? passwordHash : "");
    this.ttlMs = ttlMs;
    this.clock = clock;
    this.sessions = new Map();
  }

  get enabled() {
    return this.password.length > 0 || Boolean(this.passwordHash);
  }

  setPasswordHash(passwordHash) {
    this.password = "";
    this.passwordHash = parseScryptHash(typeof passwordHash === "string" ? passwordHash : "");
  }

  verifyPassword(candidate) {
    if (!this.enabled || typeof candidate !== "string" || candidate.length > 256) return false;
    if (this.passwordHash) {
      const actual = scryptSync(candidate, this.passwordHash.salt, this.passwordHash.expected.length);
      return timingSafeEqual(actual, this.passwordHash.expected);
    }
    return timingSafeEqual(digest(candidate), digest(this.password));
  }

  create() {
    this.prune();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = digest(token).toString("hex");
    const expiresAt = this.clock() + this.ttlMs;
    this.sessions.set(tokenHash, expiresAt);

    // Prevent a single process from retaining an unbounded number of sessions.
    if (this.sessions.size > 256) {
      const oldest = this.sessions.keys().next().value;
      this.sessions.delete(oldest);
    }
    return { token, expiresAt };
  }

  tokenFromRequest(request) {
    const token = parseCookies(request.headers.cookie).get(COOKIE_NAME);
    if (!token || !/^[a-zA-Z0-9_-]{40,64}$/.test(token)) return undefined;
    return token;
  }

  authenticate(request) {
    // An uninitialized instance must be set up before configuration data can
    // be viewed or changed. Only the first-time setup endpoint is available.
    if (!this.enabled) return false;
    const token = this.tokenFromRequest(request);
    if (!token) return false;
    const tokenHash = digest(token).toString("hex");
    const expiresAt = this.sessions.get(tokenHash);
    if (!expiresAt) return false;
    if (expiresAt <= this.clock()) {
      this.sessions.delete(tokenHash);
      return false;
    }
    return true;
  }

  destroy(request) {
    const token = this.tokenFromRequest(request);
    if (!token) return;
    this.sessions.delete(digest(token).toString("hex"));
  }

  clear() {
    this.sessions.clear();
  }

  prune() {
    const now = this.clock();
    for (const [tokenHash, expiresAt] of this.sessions) {
      if (expiresAt <= now) this.sessions.delete(tokenHash);
    }
  }

  cookie(token, request) {
    const maxAge = Math.floor(this.ttlMs / 1000);
    const secure = request.secure ? "; Secure" : "";
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  }

  clearCookie(request) {
    const secure = request.secure ? "; Secure" : "";
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
  }
}
