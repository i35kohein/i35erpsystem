#!/usr/bin/env node
/**
 * UI conventions check ("lint rule" from UI_UX_AUDIT.md P3 #14).
 *
 * Scans src for two anti-patterns so the design system stays consistent:
 *   1. Raw hex colors in className (use theme tokens / ui primitives instead)
 *   2. <div onClick> without role/tabIndex (should be <button> or role="button")
 *
 * Usage: npm run check:ui
 * Exit code 1 when violations are found (still prints counts so it can be
 * used as a soft gate; run with --warn to always exit 0).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');
const WARN_ONLY = process.argv.includes('--warn');

function walk(dir) {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.(tsx|ts)$/.test(p)) out.push(p);
  }
  return out;
}

function findTagEnd(s, start) {
  let inStr = null; let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

const files = walk(SRC);
const hexRe = /(?:text|bg|border|ring|fill|stroke)-\[#([0-9A-Fa-f]{3,8})\]/;
let hexCount = 0;
let divCount = 0;
const hexByColor = new Map();
const divSamples = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // raw hex utilities
    let m;
    const re = new RegExp(hexRe.source, 'g');
    while ((m = re.exec(line)) !== null) {
      hexCount++;
      hexByColor.set(`#${m[1].toUpperCase()}`, (hexByColor.get(`#${m[1].toUpperCase()}`) || 0) + 1);
    }
  }
  // clickable divs without role/tabIndex (skip stopPropagation wrappers).
  // Whole-file scan so multiline tags like <div \n onClick={...}> are caught
  // (the old per-line scan silently missed those — false "0").
  const dre = /<div\b/g;
  let d;
  while ((d = dre.exec(content)) !== null) {
    const tagEnd = findTagEnd(content, d.index + 1);
    if (tagEnd === -1) break;
    const tag = content.slice(d.index, tagEnd + 1);
    if (!/onClick|onMouseDown/.test(tag)) continue;
    if (/role=|tabIndex/.test(tag)) continue;
    if (tag.includes('stopPropagation')) continue;
    divCount++;
    if (divSamples.length < 5) {
      const lineNo = content.slice(0, d.index).split('\n').length;
      divSamples.push(`${file.replace(SRC + '/', '')}:${lineNo} ${tag.replace(/\s+/g, ' ').trim().slice(0, 80)}`);
    }
  }
}

console.log('── UI conventions check ───────────────────────────────');
console.log(`Raw hex color utilities : ${hexCount} (${hexByColor.size} distinct colors)`);
const top = [...hexByColor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
for (const [c, n] of top) console.log(`   ${c}: ${n}`);
console.log(`Clickable <div> w/o role: ${divCount}`);
for (const s of divSamples) console.log(`   ${s}`);
console.log('──────────────────────────────────────────────────────');

const fail = hexCount > 0 || divCount > 0;
if (fail && !WARN_ONLY) {
  console.log('❌ Violations found. Prefer ui/ primitives + theme tokens (see WORKFLOW.md §UI conventions).');
  process.exit(1);
}
if (fail && WARN_ONLY) console.log('⚠️  Violations found (warn mode — exit 0).');
else console.log('✅ Clean.');
