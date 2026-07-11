import { readFile } from "node:fs/promises";
import path from "node:path";
import { atomicWriteJson } from "./config-store.mjs";

const AUTH_FILE_MAX_BYTES = 8 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readJsonFile(filePath) {
  const source = await readFile(filePath, "utf8");
  if (source.length > AUTH_FILE_MAX_BYTES) throw new Error(`Authentication file exceeds ${AUTH_FILE_MAX_BYTES} bytes.`);
  return JSON.parse(source);
}

export class AuthStore {
  #current;
  #initializing;

  constructor({ authPath }) {
    if (!authPath) throw new TypeError("authPath is required.");
    this.authPath = path.resolve(authPath);
    this.ready = false;
  }

  async init() {
    if (this.ready) return this.get();
    if (this.#initializing) return this.#initializing;
    this.#initializing = (async () => {
      try {
        const stored = await readJsonFile(this.authPath);
        this.#current = {
          schemaVersion: 1,
          passwordHash: typeof stored?.passwordHash === "string" ? stored.passwordHash : "",
          recoveryEmail: typeof stored?.recoveryEmail === "string" ? stored.recoveryEmail.trim().toLowerCase() : "",
        };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        this.#current = { schemaVersion: 1, passwordHash: "", recoveryEmail: "" };
      }
      this.ready = true;
      return this.get();
    })();
    try { return await this.#initializing; } finally { this.#initializing = undefined; }
  }

  get() { if (!this.ready || !this.#current) throw new Error("AuthStore has not been initialized."); return structuredClone(this.#current); }
  isConfigured() { return Boolean(this.#current?.passwordHash); }
  hasRecovery() { return this.hasRecoveryEmail(); }
  hasRecoveryEmail() { return Boolean(this.#current?.recoveryEmail && EMAIL_PATTERN.test(this.#current.recoveryEmail)); }
  getPasswordHash() { return this.#current?.passwordHash || ""; }
  getRecoveryEmail() { return this.#current?.recoveryEmail || ""; }

  async setCredentials({ passwordHash, recoveryEmail } = {}) {
    const normalizedEmail = typeof recoveryEmail === "string" ? recoveryEmail.trim().toLowerCase() : "";
    if (typeof passwordHash !== "string" || !passwordHash) throw new TypeError("passwordHash is required.");
    if (!EMAIL_PATTERN.test(normalizedEmail)) throw new TypeError("recoveryEmail is required.");
    const next = { schemaVersion: 1, passwordHash, recoveryEmail: normalizedEmail };
    await atomicWriteJson(this.authPath, next);
    this.#current = next;
    this.ready = true;
    return this.get();
  }
}
