import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function newCode() {
  // The first two characters guarantee that every code contains both a letter and a number.
  const letter = "ABCDEFGHJKLMNPQRSTUVWXYZ"[randomInt(24)];
  const digit = "23456789"[randomInt(8)];
  const remaining = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return [letter, digit, ...remaining].sort(() => randomInt(3) - 1).join("");
}

export class RecoveryCodeStore {
  constructor({ ttlMs = 10 * 60 * 1000, cooldownMs = 60 * 1000, maxAttempts = 5, clock = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.cooldownMs = cooldownMs;
    this.maxAttempts = maxAttempts;
    this.clock = clock;
    this.entries = new Map();
  }

  prune() {
    const now = this.clock();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }

  status(email) {
    this.prune();
    const entry = this.entries.get(email.toLowerCase());
    const remainingMs = Math.max(0, (entry?.lastIssuedAt ?? 0) + this.cooldownMs - this.clock());
    return { allowed: remainingMs === 0, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }

  issue(email) {
    this.prune();
    const code = newCode();
    const now = this.clock();
    this.entries.set(email.toLowerCase(), { hash: digest(code), expiresAt: now + this.ttlMs, lastIssuedAt: now, attempts: 0 });
    return { code, expiresAt: now + this.ttlMs };
  }

  verify(email, code) {
    const key = email.toLowerCase();
    const entry = this.entries.get(key);
    if (!entry || entry.consumed || entry.expiresAt <= this.clock() || entry.attempts >= this.maxAttempts || typeof code !== "string" || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6}$/.test(code)) {
      if (entry?.expiresAt <= this.clock()) this.entries.delete(key);
      return false;
    }
    entry.attempts += 1;
    const valid = timingSafeEqual(entry.hash, digest(code.toUpperCase()));
    if (valid) {
      // The verification code can only be consumed once, while its separate
      // send cooldown remains available for the full 60-second window.
      entry.consumed = true;
      entry.hash = undefined;
    }
    return valid;
  }

  clear(email) {
    this.entries.delete(email.toLowerCase());
  }
}
