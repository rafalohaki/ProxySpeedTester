import { rm, writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Load tailwind config
import tailwindConfig from "../tailwind.config.cjs";

async function buildAll() {
  const DIST = "dist";
  const PUBLIC = "dist/public";

  // 1. Clean dist
  console.log("🧹 Cleaning dist...");
  await rm(DIST, { recursive: true, force: true });
  await mkdir(PUBLIC, { recursive: true });

  // 2. Build Client (JS/TSX) with Bun
  console.log("⚡ Building Client with Bun...");
  const clientBuild = await Bun.build({
    entrypoints: ["./client/src/main.tsx"],
    outdir: PUBLIC,
    naming: "assets/[name]-[hash].[ext]",
    target: "browser",
    minify: true,
    sourcemap: "external",
    plugins: [],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  if (!clientBuild.success) {
    console.error("❌ Client build failed:");
    for (const log of clientBuild.logs) console.error(log);
    process.exit(1);
  }

  const jsOutput = clientBuild.outputs.find(o => o.kind === "entry-point");
  const jsFilename = jsOutput ? jsOutput.path.split(/[\\/]/).pop() : "main.js";

  // 3. Build CSS programmatically using PostCSS
  console.log("🎨 Building CSS with PostCSS...");
  const cssInput = await readFile("./client/src/index.css", "utf-8");
  const cssFilename = `assets/style-${Date.now()}.css`;
  const cssPath = join(PUBLIC, cssFilename);

  try {
    const result = await postcss([
      tailwindcss(tailwindConfig),
      autoprefixer
    ]).process(cssInput, {
      from: "./client/src/index.css",
      to: cssPath
    });

    await writeFile(cssPath, result.css);
    console.log("   CSS built successfully");
  } catch (error) {
    console.error("❌ CSS build failed:", error);
    process.exit(1);
  }

  // 4. Handle HTML
  console.log("📄 Generating index.html...");
  let html = await readFile("./client/index.html", "utf-8");

  html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    `<script type="module" src="/${jsFilename}"></script>\n    <link rel="stylesheet" href="/${cssFilename}">`
  );

  await writeFile(join(PUBLIC, "index.html"), html);

  // 5. Build Server with Bun
  console.log("🖥️  Building Server with Bun...");
  const serverBuild = await Bun.build({
    entrypoints: ["./server/index.ts"],
    outdir: DIST,
    target: "bun",
    format: "esm",
    minify: true,
    sourcemap: "external",
    naming: "[name].mjs",
    external: ["vite"],
  });

  if (!serverBuild.success) {
    console.error("❌ Server build failed:");
    for (const log of serverBuild.logs) console.error(log);
    process.exit(1);
  }

  console.log("\n✅ Build complete!");
  console.log(`   📦 Client: ${PUBLIC}`);
  console.log(`   🚀 Server: ${DIST}/index.mjs`);
  console.log("\nTo run production server:");
  console.log("   bun run start");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
