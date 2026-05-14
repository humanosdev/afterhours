#!/usr/bin/env node
/**
 * Removes Workbox / next-pwa build outputs from public/ before `next dev`.
 * A leftover production `sw.js` precaches hashed `/_next/static/*` files; after
 * any code change, dev emits new hashes → 404 white screen until SW/cache is cleared.
 */
import fs from "node:fs";
import path from "node:path";

const pub = path.join(process.cwd(), "public");
if (!fs.existsSync(pub)) process.exit(0);

const entries = fs.readdirSync(pub);
let removed = 0;

for (const name of entries) {
  const full = path.join(pub, name);
  if (!fs.statSync(full).isFile()) continue;

  const drop =
    name === "sw.js" ||
    /^workbox-.*\.js$/.test(name) ||
    /^fallback-.*\.js$/.test(name) ||
    (/^worker-[A-Za-z0-9_-]+\.js$/.test(name) && !name.startsWith("worker-index"));

  if (drop) {
    fs.unlinkSync(full);
    removed += 1;
    console.log("[strip-pwa-artifacts] removed", name);
  }
}

if (removed) console.log("[strip-pwa-artifacts] done,", removed, "file(s)");
