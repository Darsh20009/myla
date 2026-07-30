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
    // Keep only true native addons as external (they can't be bundled).
    // @whiskeysockets/baileys is ESM-only ("type":"module") so it MUST be
    // bundled by esbuild (ESM→CJS conversion) rather than left external —
    // a CJS require() of an ESM package fails at runtime on Node 18+.
    external: [
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
