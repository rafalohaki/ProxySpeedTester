import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auto-detect production mode: check NODE_ENV
const isProduction = process.env.NODE_ENV === "production";

export function log(message: string, source = "bun") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ALWAYS serve the app on the port specified in the environment variable PORT
// Default to 5000 if not specified.
const port = parseInt(process.env.PORT || "5000", 10);

if (isProduction) {
  // Production mode: Native Bun static file server
  log("Running in PRODUCTION mode (serving static files)");

  const distPath = resolve(__dirname, "../dist/public");

  if (!existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  Bun.serve({
    port,
    hostname: "0.0.0.0",

    async fetch(req) {
      const url = new URL(req.url);
      let pathname = url.pathname;

      // Handle API routes if needed
      if (pathname.startsWith("/api")) {
        const start = Date.now();
        // API routes can be handled here
        const duration = Date.now() - start;
        log(`${req.method} ${pathname} 404 in ${duration}ms`);
        return new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Try to serve static file
      let filePath = resolve(distPath, pathname === "/" ? "index.html" : pathname.slice(1));
      let file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }

      // Fallback to index.html for SPA routing
      const indexFile = Bun.file(resolve(distPath, "index.html"));
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" }
      });
    },

    error(error) {
      log(`Server error: ${error.message}`, "error");
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  log(`🚀 Server running at http://localhost:${port}`);

} else {
  // Development mode: Use Vite dev server with HMR
  log("Running in DEVELOPMENT mode (Vite HMR)");

  const { createServer } = await import("vite");
  const { default: viteConfig } = await import("../vite.config");

  const vite = await createServer({
    ...viteConfig,
    configFile: false,
    server: {
      port,
      host: "0.0.0.0",
      strictPort: true,
      hmr: {
        port: port,
      },
    },
    appType: "spa",
  });

  await vite.listen();

  log(`🚀 Dev server running at http://localhost:${port}`);
  vite.printUrls();
}
