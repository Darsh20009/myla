import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isReplit = !!process.env.REPL_ID;
const isDev = process.env.NODE_ENV !== "production";

const replitPlugins: any[] = [];
if (isReplit && isDev) {
  try {
    const { default: runtimeErrorOverlay } = await import("@replit/vite-plugin-runtime-error-modal");
    replitPlugins.push(runtimeErrorOverlay());
  } catch {}
  try {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    replitPlugins.push(cartographer());
  } catch {}
  try {
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    replitPlugins.push(devBanner());
  } catch {}
}

export default defineConfig({
  plugins: [react(), ...replitPlugins],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
