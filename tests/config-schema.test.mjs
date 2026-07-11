import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ConfigValidationError, validateConfig } from "../server/config-schema.mjs";

const defaultConfig = JSON.parse(
  await readFile(new URL("../config/default.json", import.meta.url), "utf8"),
);

test("default configuration passes strict validation", () => {
  assert.deepEqual(validateConfig(defaultConfig), defaultConfig);
});

test("unknown properties and unsafe URLs are rejected", () => {
  const candidate = structuredClone(defaultConfig);
  candidate.identity.unexpected = "not allowed";
  candidate.links[0].url = "javascript:alert(1)";

  assert.throws(
    () => validateConfig(candidate),
    (error) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.ok(error.issues.some((entry) => entry.path === "$.identity.unexpected"));
      assert.ok(error.issues.some((entry) => entry.path === "$.links[0].url"));
      return true;
    },
  );
});

test("prototype-pollution keys and duplicate IDs are rejected", () => {
  const candidate = JSON.parse(JSON.stringify(defaultConfig));
  Object.defineProperty(candidate.theme, "__proto__", {
    value: "blocked",
    enumerable: true,
  });
  candidate.metrics[1].id = candidate.metrics[0].id;

  assert.throws(
    () => validateConfig(candidate),
    (error) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.ok(error.issues.some((entry) => entry.path === "$.theme.__proto__"));
      assert.ok(error.issues.some((entry) => entry.path === "$.metrics[1].id"));
      return true;
    },
  );
});
