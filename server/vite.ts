import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  // In the Replit preview environment the proxy blocks Vite's HMR WebSocket,
  // causing a noisy 400 error. HMR is not required for the app to work, so
  // we disable it when running on Replit dev and fall back to a shared-server
  // WS setup elsewhere.
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const serverOptions = {
    middlewareMode: true,
    hmr: replitDomain
      ? false
      : {
          server,
          clientPort: 443,
          protocol: "wss" as const,
        },
    allowedHosts: true as const,
  };

  // Resolve config — supports both plain object and async function exports
  const resolvedConfig = typeof viteConfig === "function"
    ? await (viteConfig as any)({} as any)
    : viteConfig;

  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Only hard-exit on real startup/config errors; skip transient HMR/transform noise
        if (
          !msg.includes("Pre-transform error") &&
          !msg.includes("Failed to load url") &&
          !msg.includes("WebSocket") &&
          !msg.includes("hmr")
        ) {
          process.exit(1);
        }
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Let Express handle XML / txt / json at known non-SPA paths
    if (url === "/sitemap.xml" || url === "/robots.txt" || url.startsWith("/api/")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
