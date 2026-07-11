import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

await build({
  root,
  configFile: false,
  esbuild: { jsx: "automatic" },
  resolve: { preserveSymlinks: true },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
