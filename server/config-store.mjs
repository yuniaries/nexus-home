import { randomBytes } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { configContentSignature, validateConfig } from "./config-schema.mjs";

const MAX_CONFIG_FILE_BYTES = 512 * 1024;

export class RevisionConflictError extends Error {
  constructor(expectedRevision, actualRevision) {
    super(`Configuration revision ${expectedRevision} is stale; current revision is ${actualRevision}.`);
    this.name = "RevisionConflictError";
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

function clone(value) {
  return structuredClone(value);
}

async function readJsonFile(filePath) {
  const metadata = await stat(filePath);
  if (metadata.size > MAX_CONFIG_FILE_BYTES) {
    throw new Error(`Configuration file exceeds ${MAX_CONFIG_FILE_BYTES} bytes.`);
  }

  const source = await readFile(filePath, "utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Cannot parse configuration file ${filePath}: ${error.message}`, { cause: error });
  }
}

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    // Windows and some container file systems do not support fsync on a directory.
    if (!["EINVAL", "EPERM", "EISDIR", "ENOTSUP"].includes(error.code)) throw error;
  } finally {
    await handle?.close();
  }
}

export async function atomicWriteJson(filePath, value) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let handle;

  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(payload, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;

    await rename(temporaryPath, filePath);
    await syncDirectory(directory);
  } catch (error) {
    await handle?.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export class ConfigStore {
  #current;
  #initializing;
  #writeQueue = Promise.resolve();

  constructor({ defaultPath, configPath, clock = () => new Date(), writer = atomicWriteJson }) {
    if (!defaultPath || !configPath) throw new TypeError("defaultPath and configPath are required.");
    this.defaultPath = path.resolve(defaultPath);
    this.configPath = path.resolve(configPath);
    this.clock = clock;
    this.writer = writer;
    this.ready = false;
  }

  async init() {
    if (this.ready) return this.get();
    if (this.#initializing) return this.#initializing;

    this.#initializing = (async () => {
      const fallback = validateConfig(await readJsonFile(this.defaultPath));
      let stored;

      try {
        const rawStored = await readJsonFile(this.configPath);
        stored = validateConfig({
          ...fallback,
          ...rawStored,
          identity: { ...fallback.identity, ...rawStored.identity },
          theme: { ...fallback.theme, ...rawStored.theme },
          effects: { ...fallback.effects, ...rawStored.effects },
          layout: { ...fallback.layout, ...rawStored.layout },
          activity: { ...fallback.activity, ...rawStored.activity },
        });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        stored = fallback;
        await this.writer(this.configPath, stored);
      }

      this.#current = stored;
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
    if (!this.ready || !this.#current) throw new Error("ConfigStore has not been initialized.");
    return clone(this.#current);
  }

  async replace(input, { expectedRevision } = {}) {
    if (!this.ready) await this.init();

    const performWrite = async () => {
      const current = this.#current;
      if (
        expectedRevision !== undefined &&
        expectedRevision !== null &&
        expectedRevision !== current.revision
      ) {
        throw new RevisionConflictError(expectedRevision, current.revision);
      }

      const normalized = validateConfig(input);
      if (configContentSignature(normalized) === configContentSignature(current)) {
        return { config: this.get(), changed: false };
      }

      const next = {
        ...normalized,
        schemaVersion: current.schemaVersion,
        revision: current.revision + 1,
        updatedAt: this.clock().toISOString(),
      };

      // Validate server-owned metadata too before any bytes reach persistent storage.
      const validated = validateConfig(next);
      await this.writer(this.configPath, validated);
      this.#current = validated;

      return { config: this.get(), changed: true };
    };

    const result = this.#writeQueue.then(performWrite, performWrite);
    this.#writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
