import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ConfigStore, RevisionConflictError } from "../server/config-store.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "nexus-store-"));
  const defaultPath = path.join(directory, "default.json");
  const configPath = path.join(directory, "data", "config.json");
  await copyFile(new URL("../config/default.json", import.meta.url), defaultPath);
  t.after(async () => {
    await import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true }));
  });
  return { directory, defaultPath, configPath };
}

test("store initializes from defaults and atomically persists replacements", async (t) => {
  const paths = await fixture(t);
  const store = new ConfigStore({
    ...paths,
    clock: () => new Date("2026-07-10T12:34:56.000Z"),
  });
  const initial = await store.init();
  assert.equal(initial.revision, 1);

  const candidate = structuredClone(initial);
  candidate.identity.brand = "NEXUS // TEST";
  const result = await store.replace(candidate, { expectedRevision: 1 });

  assert.equal(result.changed, true);
  assert.equal(result.config.revision, 2);
  assert.equal(result.config.updatedAt, "2026-07-10T12:34:56.000Z");
  assert.equal(result.config.identity.brand, "NEXUS // TEST");

  const persisted = JSON.parse(await readFile(paths.configPath, "utf8"));
  assert.deepEqual(persisted, result.config);
  assert.deepEqual(
    (await readdir(path.dirname(paths.configPath))).filter((name) => name.endsWith(".tmp")),
    [],
  );
});

test("store rejects stale writes and leaves the committed state intact on write failure", async (t) => {
  const paths = await fixture(t);
  const store = new ConfigStore(paths);
  const initial = await store.init();
  const first = structuredClone(initial);
  first.identity.name = "FIRST";
  await store.replace(first, { expectedRevision: 1 });

  const stale = structuredClone(initial);
  stale.identity.name = "STALE";
  await assert.rejects(
    store.replace(stale, { expectedRevision: 1 }),
    (error) => error instanceof RevisionConflictError && error.actualRevision === 2,
  );

  const beforeFailure = store.get();
  store.writer = async () => {
    throw new Error("simulated disk failure");
  };
  const next = structuredClone(beforeFailure);
  next.identity.name = "UNCOMMITTED";
  await assert.rejects(store.replace(next, { expectedRevision: 2 }), /simulated disk failure/);
  assert.deepEqual(store.get(), beforeFailure);
});

test("identical content is a no-op and does not increment the revision", async (t) => {
  const paths = await fixture(t);
  const store = new ConfigStore(paths);
  const initial = await store.init();
  const result = await store.replace(initial, { expectedRevision: 1 });
  assert.equal(result.changed, false);
  assert.equal(result.config.revision, 1);
});
