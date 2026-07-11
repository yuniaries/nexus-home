import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function hashPassword(password) {
  if (typeof password !== "string" || !password) {
    throw new TypeError("password is required");
  }
  const salt = randomBytes(20);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (executedPath && fileURLToPath(import.meta.url) === executedPath) {
  const password = process.argv[2];
  if (!password) {
    console.error("用法: node server/hash-password.mjs <你的密码>");
    process.exitCode = 1;
  } else {
    console.log(`CONFIG_PASSWORD_HASH=${hashPassword(password)}`);
  }
}
