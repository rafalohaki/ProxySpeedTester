import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("🏗️  Building client with Vite...");
  await viteBuild();

  console.log("🏗️  Building server with Bun...");

  // Use Bun's native bundler
  const result = await Bun.build({
    entrypoints: ["./server/index.ts"],
    outdir: "./dist",
    target: "bun",
    format: "esm",
    minify: true,
    splitting: false,
    sourcemap: "external",
    naming: "[name].mjs",
    external: [
      // Keep external packages that need native bindings
      "bufferutil",
      "utf-8-validate",
      "vite", // Keep vite external as it's only used in dev mode
    ],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("");
  console.log("✅ Build complete!");
  console.log("   📦 Client: dist/public/");
  console.log("   🚀 Server: dist/index.mjs");
  console.log("");
  console.log("To run production server:");
  console.log("   bun run start");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
