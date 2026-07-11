import { readFile } from "node:fs/promises";
import path from "node:path";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { atomicWriteJson } from "./config-store.mjs";

const AUTH_FILE_MAX_BYTES = 8 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return typeof value === "string" ? value.normalize("NFC").trim() : "";
}

async function readJsonFile(filePath) {
  const source = await readFile(filePath, "utf8");
  if (source.length > AUTH_FILE_MAX_BYTES) {
    throw new Error(`Authentication file exceeds ${AUTH_FILE_MAX_BYTES} bytes.`);
  }
  return JSON.parse(source);
}

function parseScryptHash(value) {
  if (!value) return undefined;
  const [algorithm, saltText, digestText] = value.split("$");
  if (algorithm !== "scrypt" || !saltText || !digestText) return undefined;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(digestText, "base64url");
  if (salt.length < 16 || expected.length < 32) return undefined;
  return { salt, expected };
}

function verifyScryptHash(candidate, storedHash) {
  const parsed = parseScryptHash(storedHash);
  if (!parsed || typeof candidate !== "string" || candidate.length > 256) return false;
  const actual = scryptSync(candidate, parsed.salt, parsed.expected.length);
  return timingSafeEqual(actual, parsed.expected);
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
          recoveryQuestion: typeof stored?.recoveryQuestion === "string" ? stored.recoveryQuestion : "",
          recoveryAnswerHash: typeof stored?.recoveryAnswerHash === "string" ? stored.recoveryAnswerHash : "",
        };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        this.#current = { schemaVersion: 1, passwordHash: "", recoveryEmail: "", recoveryQuestion: "", recoveryAnswerHash: "" };
      }
      this.ready = true;
      return this.get();
    })();

    try {
      return await this.#initializing;
    } finally {
      this.#initializing = undefined;
    }
  }

  get() {
    if (!this.ready || !this.#current) throw new Error("AuthStore has not been initialized.");
    return structuredClone(this.#current);
  }

  isConfigured() {
    return Boolean(this.#current?.passwordHash);
  }

  hasRecovery() {
    return this.hasRecoveryEmail() || Boolean(this.#current?.recoveryQuestion && this.#current?.recoveryAnswerHash);
  }

  hasRecoveryEmail() {
    return Boolean(this.#current?.recoveryEmail && EMAIL_PATTERN.test(this.#current.recoveryEmail));
  }

  getRecoveryEmail() {
    return this.#current?.recoveryEmail || "";
  }

  getPasswordHash() {
    return this.#current?.passwordHash || "";
  }

  getRecoveryQuestion() {
    return this.#current?.recoveryQuestion || "";
  }

  getRecoveryAnswerHash() {
    return this.#current?.recoveryAnswerHash || "";
  }

  verifyRecoveryAnswer(candidate) {
    return verifyScryptHash(normalizeText(candidate), this.#current?.recoveryAnswerHash || "");
  }

  async setCredentials({ passwordHash, recoveryEmail = "", recoveryQuestion = "", recoveryAnswerHash = "" } = {}) {
    if (typeof passwordHash !== "string" || !passwordHash) {
      throw new TypeError("passwordHash is required.");
    }
    const normalizedEmail = typeof recoveryEmail === "string" ? recoveryEmail.trim().toLowerCase() : "";
    const normalizedQuestion = normalizeText(recoveryQuestion);
    const legacyRecoveryConfigured = normalizedQuestion && typeof recoveryAnswerHash === "string" && recoveryAnswerHash;
    if (!EMAIL_PATTERN.test(normalizedEmail) && !legacyRecoveryConfigured) throw new TypeError("recoveryEmail or recovery question is required.");
    const next = {
      schemaVersion: 1,
      passwordHash,
      recoveryEmail: EMAIL_PATTERN.test(normalizedEmail) ? normalizedEmail : "",
      recoveryQuestion: normalizedQuestion,
      recoveryAnswerHash: legacyRecoveryConfigured ? recoveryAnswerHash : "",
    };
    await atomicWriteJson(this.authPath, next);
    this.#current = next;
    this.ready = true;
    return this.get();
  }

  async setPasswordHash(passwordHash) {
    return this.setCredentials({
      passwordHash,
      recoveryEmail: this.getRecoveryEmail(),
      recoveryQuestion: this.getRecoveryQuestion(),
      recoveryAnswerHash: this.getRecoveryAnswerHash(),
    });
  }
}
