import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createNexusApp } from "./app.mjs";
import { createMailApi } from "./mail-api.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = process.env.HOST?.trim() || "0.0.0.0";
const requestedPort = Number(process.env.PORT ?? 21026);

if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
  throw new Error("PORT must be an integer between 0 and 65535.");
}

const serviceMode = process.env.SERVICE_MODE?.trim();
const runtime = serviceMode === "mail-api"
  ? createMailApi()
  : await createNexusApp({ rootDir });
const server = runtime.app.listen(requestedPort, host, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  const urls = new Set([`http://localhost:${port}`]);

  if (host === "0.0.0.0" || host === "::") {
    for (const entries of Object.values(networkInterfaces())) {
      for (const entry of entries ?? []) {
        if (entry.family === "IPv4" && !entry.internal) urls.add(`http://${entry.address}:${port}`);
      }
    }
  } else {
    urls.add(`http://${host}:${port}`);
  }

  console.log(serviceMode === "mail-api" ? "\nNEXUS MAIL API is ready:" : "\nNEXUS HOME is ready:");
  for (const url of urls) {
    if (serviceMode === "mail-api") console.log(`  Health: ${url}/health`);
    else {
      console.log(`  Home:   ${url}/`);
      console.log(`  Config: ${url}/config`);
    }
  }
  console.log("");
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Received ${signal}; shutting down...`);

  await runtime.dispose().catch((error) => console.error("Cleanup failed", error));
  server.close((error) => {
    if (error) {
      console.error("HTTP server shutdown failed", error);
      process.exitCode = 1;
    }
  });

  const forceTimer = setTimeout(() => {
    server.closeAllConnections?.();
  }, 5_000);
  forceTimer.unref?.();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

server.on("error", async (error) => {
  console.error("Cannot start NEXUS HOME", error);
  await runtime.dispose().catch(() => {});
  process.exitCode = 1;
});
