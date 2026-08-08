#!/usr/bin/env node
// Block-aware pass: extract <button>/<div onClick> elements fully (multi-line
// className), then classify sizes. Emits JSON to stdout.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'src');
const files = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(n)) files.push(p);
  }
})(SRC);

const BUTTON_RE = /<button\b[^>]*>/gs;
const OPEN_RE = /<button\b/;
const CLOSE_RE = />/;

function extractBlocks(src) {
  // naive: find each '<button' then scan forward until the matching '>' at depth 0 for angle brackets
  const blocks = [];
  let idx = 0;
  while (true) {
    const start = src.indexOf('<button', idx);
    if (start < 0) break;
    // skip self-closing or find tag end (first '>' that is not inside quotes)
    let depth = 0, i = start, inQ = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (inQ) { if (ch === inQ) inQ = null; continue; }
      if (ch === '"' || ch === "'") { inQ = ch; continue; }
      if (ch === '<') depth++;
      else if (ch === '>') { depth--; if (depth === 0) break; }
    }
    const block = src.slice(start, i + 1);
    blocks.push(block);
    idx = i + 1;
  }
  return blocks;
}

const out = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const buttons = extractBlocks(src);
  const sizes = { h: {}, py: {}, minH: {}, text: {} };
  const unlabeled = [];
  for (const b of buttons) {
    const cls = (b.match(/className=\{?["'`]([^"'`]*)["'`]/) || [])[1] || '';
    const hs = cls.match(/\bh-(\d+(?:\.\d+)?)\b/g);
    hs?.forEach((h) => { sizes.h[h] = (sizes.h[h] || 0) + 1; });
    const pys = cls.match(/\bpy-(\d+(?:\.\d+)?)\b/g);
    pys?.forEach((p) => { sizes.py[p] = (sizes.py[p] || 0) + 1; });
    const mhs = cls.match(/\bmin-h-(\d+)\b/g);
    mhs?.forEach((m) => { sizes.minH[m] = (sizes.minH[m] || 0) + 1; });
    const ts = cls.match(/\btext-\[(\d+)px\]|\btext-(xs|sm|base|lg|xl|2xl)\b/g);
    ts?.forEach((t) => { sizes.text[t] = (sizes.text[t] || 0) + 1; });
    // icon-only without label: no aria-label AND no text content (just icon/svg)
    if (!/aria-label/.test(b) && !/>[^<{]*[A-Za-z][^<{]*</.test(b) && /svg|<[A-Z][A-Za-z]+\s/.test(b)) {
      unlabeled.push(src.slice(0, src.indexOf(b)).split('\n').length);
    }
  }
  out.push({ file: rel, buttons: buttons.length, sizes, unlabeled: unlabeled.length });
}
process.stdout.write(JSON.stringify(out, null, 2));
