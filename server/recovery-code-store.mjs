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
  constructor({ ttlMs = 10 * 60 * 1000, maxAttempts = 5, clock = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.maxAttempts = maxAttempts;
    this.clock = clock;
    this.entries = new Map();
  }

  issue(email) {
    const code = newCode();
    this.entries.set(email.toLowerCase(), { hash: digest(code), expiresAt: this.clock() + this.ttlMs, attempts: 0 });
    return { code, expiresAt: this.clock() + this.ttlMs };
  }

  verify(email, code) {
    const key = email.toLowerCase();
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= this.clock() || entry.attempts >= this.maxAttempts || typeof code !== "string" || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6}$/.test(code)) {
      this.entries.delete(key);
      return false;
    }
    entry.attempts += 1;
    const valid = timingSafeEqual(entry.hash, digest(code.toUpperCase()));
    if (valid) this.entries.delete(key);
    return valid;
  }

  clear(email) {
    this.entries.delete(email.toLowerCase());
  }
}
