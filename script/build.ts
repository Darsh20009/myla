import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  // Bundle ALL dependencies into a single CJS file — no node_modules needed at runtime.
  // CJS format avoids all ESM/CJS interop issues (no createRequire conflicts).
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    // Mark baileys and its native/ESM-only deps as external so they are
    // loaded from node_modules at runtime (the Dockerfile runs npm ci).
    external: [
      "@whiskeysockets/baileys",
      "node-cache",
      "pino",
      "pino-pretty",
      "bufferutil",
      "utf-8-validate",
    ],
    packages: "bundle",
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
