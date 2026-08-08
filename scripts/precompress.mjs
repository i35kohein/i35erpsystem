#!/usr/bin/env node
// Precompress dist assets with Brotli (quality 11) so the server can serve
// .br variants with zero CPU cost. Run after `vite build`, before deploy.
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { brotliCompressSync, constants } from "zlib";

const dist = join(process.cwd(), "dist");
const EXTS = new Set([".js", ".css", ".html", ".json", ".svg", ".webmanifest", ".txt", ".map"]);
let count = 0, saved = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    const name = basename(p);
    if (name.startsWith("server.cjs")) continue; // node bundle, never served
    if (!EXTS.has(extname(p).toLowerCase())) continue;
    const out = p + ".br";
    if (existsSync(out)) continue; // keep existing (already generated)
    const src = readFileSync(p);
    const compressed = brotliCompressSync(src, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    });
    writeFileSync(out, compressed);
    count++;
    saved += src.length - compressed.length;
    console.log(
      `  br  ${(src.length / 1024).toFixed(0).padStart(6)}KB -> ${(compressed.length / 1024)
        .toFixed(0)
        .padStart(5)}KB  ${p.replace(dist + "/", "")}`
    );
  }
}

walk(dist);
console.log(`\nPrecompressed ${count} files, saved ${(saved / 1024).toFixed(0)}KB total.`);
