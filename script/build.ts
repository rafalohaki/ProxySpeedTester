// Build script for Bun HTML imports
// This file can be removed once we fully migrate to HTML imports

import { rm } from "fs/promises";
import { resolve } from "path";

async function buildAll() {
  const DIST = "dist";

  // Clean dist
  console.log("🧹 Cleaning dist...");
  await rm(DIST, { recursive: true, force: true });

  console.log("✅ Build complete!");
  console.log("Use: bun build --compile ./server/index.ts --outfile dist/index.mjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
