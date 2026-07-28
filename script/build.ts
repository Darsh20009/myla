import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  // Bundle ALL dependencies into dist/index.js so the production image
  // needs zero node_modules (no npm install required at runtime).
  // Only Node.js built-in modules stay external — they are always present.
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    outExtension: { ".js": ".js" },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    // No package externals — everything bundled in
    packages: "bundle",
    logLevel: "info",
    banner: {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
