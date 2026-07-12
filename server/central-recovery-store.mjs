import { createHash, randomInt } from "node:crypto";
import { createClient } from "redis";

const CODE_TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function normalizeEmail(email) { return typeof email === "string" ? email.trim().toLowerCase() : ""; }
function scopedKey(prefix, kind, scope, email) { return `${prefix}:${kind}:${digest(`${scope}\0${normalizeEmail(email)}`)}`; }
function newCode() {
  const letter = "ABCDEFGHJKLMNPQRSTUVWXYZ"[randomInt(24)];
  const digit = "23456789"[randomInt(8)];
  const remaining = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return [letter, digit, ...remaining].sort(() => randomInt(3) - 1).join("");
}

const VERIFY_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local entry = cjson.decode(raw)
if tonumber(entry.attempts or 0) >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]); return -2 end
if entry.hash == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end
entry.attempts = tonumber(entry.attempts or 0) + 1
if entry.attempts >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]); return -2 end
redis.call('SET', KEYS[1], cjson.encode(entry), 'KEEPTTL')
return -1
`;

const IP_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;

export class RedisRecoveryStore {
  constructor({ url = process.env.REDIS_URL ?? "", prefix = "nexus:recovery", client } = {}) {
    this.url = url.trim();
    this.prefix = prefix;
    this.client = client ?? (this.url ? createClient({ url: this.url }) : undefined);
    this.connecting = undefined;
  }

  get configured() { return Boolean(this.client); }
  async #ready() {
    if (!this.client) throw new Error("Redis 未配置。");
    if (this.client.isOpen) return;
    if (!this.connecting) this.connecting = this.client.connect().finally(() => { this.connecting = undefined; });
    await this.connecting;
  }
  #codeKey(scope, email) { return scopedKey(this.prefix, "code", scope, email); }
  #cooldownKey(scope, email) { return scopedKey(this.prefix, "cooldown", scope, email); }
  #ipKey(ip) { return `${this.prefix}:ip:${digest(ip)}`; }

  async status({ scope, email }) {
    await this.#ready();
    const ttl = await this.client.pTTL(this.#cooldownKey(scope, email));
    return { retryAfterSeconds: ttl > 0 ? Math.ceil(ttl / 1000) : 0 };
  }
  async ping() {
    await this.#ready();
    return this.client.ping();
  }
  async consumeIp(ip) {
    await this.#ready();
    const [count, ttl] = await this.client.eval(IP_LIMIT_SCRIPT, { keys: [this.#ipKey(ip || "unknown")], arguments: [String(COOLDOWN_MS)] });
    return { allowed: Number(count) <= 5, retryAfterSeconds: Math.max(1, Math.ceil(Number(ttl) / 1000)) };
  }
  async issue({ scope, email }) {
    await this.#ready();
    const cooldownKey = this.#cooldownKey(scope, email);
    const reserved = await this.client.set(cooldownKey, "1", { PX: COOLDOWN_MS, NX: true });
    if (reserved !== "OK") return { allowed: false, ...(await this.status({ scope, email })) };
    const code = newCode();
    await this.client.set(this.#codeKey(scope, email), JSON.stringify({ hash: digest(code), attempts: 0 }), { PX: CODE_TTL_MS });
    return { allowed: true, code, expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(), retryAfterSeconds: Math.ceil(COOLDOWN_MS / 1000) };
  }
  async verify({ scope, email, code }) {
    await this.#ready();
    const result = Number(await this.client.eval(VERIFY_SCRIPT, { keys: [this.#codeKey(scope, email)], arguments: [digest(String(code).trim().toUpperCase()), String(MAX_ATTEMPTS)] }));
    return { valid: result === 1, exhausted: result === -2 };
  }
  async clear({ scope, email }) {
    await this.#ready();
    await this.client.del([this.#codeKey(scope, email), this.#cooldownKey(scope, email)]);
  }
  async close() { if (this.client?.isOpen) await this.client.quit(); }
}
