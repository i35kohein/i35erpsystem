#!/usr/bin/env node
/**
 * build-translation-dictionary.mjs
 *
 * Extracts the full English→Myanmar translation dictionary from:
 *   1. src/lib/domTranslate.ts      (flat EN→MM DOM auto-translate pairs)
 *   2. src/data/translations.ts     (structured i18n keys: { en, mm })
 *
 * Then scans components with the TypeScript compiler AST to find UI strings
 * that are missing or only partially translated.
 *
 * Outputs (into <project>/translations/):
 *   - translation-dictionary.csv      — merged, deduped EN→MM dictionary
 *   - manual-translation-worklist.csv — UI strings needing manual translation
 *   - translation-report.txt          — summary, conflicts, missing t() keys
 *
 * Run: node scripts/build-translation-dictionary.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, relative } from 'path';
import ts from 'typescript';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'translations');
mkdirSync(OUT, { recursive: true });

const BOM = '\ufeff';
const csv = (rows) =>
  BOM +
  rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n') +
  '\r\n';

// ---------- 1. Parse domTranslate.ts ----------
const domSrc = readFileSync(join(SRC, 'lib/domTranslate.ts'), 'utf8');
const tupleRe = /\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
const domPairs = [];
let m;
while ((m = tupleRe.exec(domSrc))) domPairs.push([m[1], m[2]]);

// ---------- 2. Parse translations.ts ----------
const trSrc = readFileSync(join(SRC, 'data/translations.ts'), 'utf8');
const keyRe = /^\s*(\w+):\s*\{\s*en:\s*(?:"([^"]*)"|'([^']*)')\s*,\s*mm:\s*(?:"([^"]*)"|'([^']*)')\s*\}/gm;
const i18nPairs = [];
while ((m = keyRe.exec(trSrc))) i18nPairs.push([m[1], m[2] ?? m[3], m[4] ?? m[5]]);
const i18nKeys = new Set(i18nPairs.map(([k]) => k));

// ---------- 3. Merge dictionary ----------
const dict = new Map(); // EN -> { mm, sources:Set, i18nKey }
const addEntry = (en, mm, source, i18nKey) => {
  en = en.trim();
  if (!en) return;
  const existing = dict.get(en);
  if (!existing) {
    dict.set(en, { mm, sources: new Set([source]), i18nKey: i18nKey ?? null });
    return;
  }
  existing.sources.add(source);
  if (i18nKey) existing.i18nKey = i18nKey;
  if (existing.mm !== mm) existing.mm = existing.mm + ' ⚠CONFLICT(' + mm + ')';
};
for (const [en, mm] of domPairs) addEntry(en, mm, 'domTranslate');
for (const [key, en, mm] of i18nPairs) addEntry(en, mm, 'i18n', key);

// Longest EN first (mirrors domTranslate runtime)
const SORTED = [...dict.entries()].sort((a, b) => b[0].length - a[0].length);
const simulate = (s) => {
  let out = s;
  for (const [en, entry] of SORTED) if (out.includes(en)) out = out.split(en).join(entry.mm);
  return out;
};

// Tech terms deliberately kept in English (project policy) — leftovers of these
// after translation are NOT considered "needs work".
const TECH_TERMS = new Set(
  (
    'iphone ipad macbook mac apple watch airpods imac homepod ipod itunes icloud imei serial qr barcode ' +
    'pos qa rma sku passcode mmk ai id sim lcd oled amoled usb hdmi bluetooth wifi vpn erp csv pdf kpi vat ' +
    'gps nfc led ic smd bga cpu gpu ram rom ssd hdd pcb flex camera zoom whatsapp facebook telegram viber ' +
    'matrix catalog voucher database online offline p&l bin ok na n/a app ios macos linux windows android ' +
    'supabase firebase gemini chatgpt deepseek kimi'
  ).split(/\s+/)
);
const leftoverEnglish = (s) => {
  const tokens = s.match(/[A-Za-z]+/g) ?? [];
  const leftover = new Set();
  for (const t of tokens) {
    if (!/[a-z]/.test(t)) continue; // all-caps code/abbreviation
    if (TECH_TERMS.has(t.toLowerCase())) continue;
    leftover.add(t);
  }
  return leftover;
};

// ---------- 4. AST scan of components ----------
const ATTR_NAMES = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'description', 'confirmText']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) files.push(p);
  }
})(SRC);

const candidates = []; // { text, file, line, kind, coverage, leftover }
const missingTKeys = new Set();
const allCode = files.map((f) => readFileSync(f, 'utf8')).join('\n');

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const push = (text, lineNo, kind) => {
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length < 2) return;
    if (!/[a-z]/i.test(text)) return; // no letters at all
    if (!/[a-z]/.test(text)) return; // all-caps codes / tech terms stay EN
    if (/^[\s\u1000-\u109F]+$/.test(text)) return;
    const translated = simulate(text);
    let coverage;
    let leftover;
    if (translated === text) {
      coverage = 'uncovered';
      leftover = new Set(text.match(/[A-Za-z]+/g) ?? []);
    } else {
      leftover = leftoverEnglish(translated);
      coverage = leftover.size === 0 ? 'covered' : 'partial';
    }
    candidates.push({ text, file: rel, line: lineNo, kind, coverage, leftover: [...leftover] });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      // Skip <style>/<script> blocks
      const parent = node.parent;
      if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) {
        const tag = (parent.tagName?.getText(sf) ?? '').toLowerCase();
        if (tag === 'style' || tag === 'script') return;
      }
      push(node.text, lineOf(node.getStart(sf)), 'jsx-text');
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (ATTR_NAMES.has(name) && node.initializer && ts.isStringLiteral(node.initializer)) {
        push(node.initializer.text, lineOf(node.initializer.getStart(sf)), `attr:${name}`);
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === 't' && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg)) {
          if (!i18nKeys.has(arg.text)) missingTKeys.add(arg.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// Dedupe by text, merge locations & coverage
const candMap = new Map();
for (const c of candidates) {
  const existing = candMap.get(c.text);
  if (existing) {
    existing.locations.push(`${c.file}:${c.line}`);
    if (existing.coverage === 'covered' && c.coverage !== 'covered') {
      existing.coverage = c.coverage;
      existing.leftover = c.leftover;
    }
  } else {
    c.locations = [`${c.file}:${c.line}`];
    candMap.set(c.text, c);
  }
}
const worklist = [...candMap.values()]
  .filter((c) => c.coverage !== 'covered')
  .sort((a, b) => a.coverage.localeCompare(b.coverage) || a.text.localeCompare(b.text));

// ---------- 5. Dictionary CSV ----------
const dictRows = [
  ['#', 'English', 'Myanmar', 'Source', 'In code?', 'Notes'],
  ...[...dict.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([en, e], i) => [
      i + 1,
      en,
      e.mm,
      [...e.sources].join('+'),
      allCode.includes(en) ? 'yes' : 'no',
      e.i18nKey ? `i18n key: ${e.i18nKey}` : '',
    ]),
];
writeFileSync(join(OUT, 'translation-dictionary.csv'), csv(dictRows), 'utf8');

// JSON export (EN → MM map, handy for tools)
const jsonDict = {};
for (const [en, e] of [...dict.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  jsonDict[en] = e.mm;
}
writeFileSync(join(OUT, 'translation-dictionary.json'), JSON.stringify(jsonDict, null, 2) + '\n', 'utf8');

// ---------- 6. Manual worklist CSV ----------
const workRows = [
  ['#', 'English (found in UI)', 'Myanmar (fill in)', 'Coverage', 'Leftover EN (review)', 'Found in (file:line)'],
  ...worklist.map((c, i) => [
    i + 1,
    c.text,
    '',
    c.coverage,
    c.leftover.join(' '),
    c.locations.join('; '),
  ]),
];
writeFileSync(join(OUT, 'manual-translation-worklist.csv'), csv(workRows), 'utf8');

// ---------- 7. Report ----------
const conflicts = [...dict.entries()].filter(([, e]) => e.mm.includes('⚠CONFLICT'));
const partialCount = worklist.filter((c) => c.coverage === 'partial').length;
const uncoveredCount = worklist.filter((c) => c.coverage === 'uncovered').length;
const stale = [...dict.entries()].filter(([, e]) => !allCode.includes(e[0]));

const report = [
  `Translation dictionary build report`,
  `=====================================`,
  ``,
  `Dictionary entries: ${dict.size} total`,
  `  - domTranslate pairs: ${domPairs.length}`,
  `  - i18n keys: ${i18nPairs.length}`,
  `  - conflicts (same EN, different MM): ${conflicts.length}`,
  `  - entries not found in src/ (possible stale): ${stale.length}`,
  ...[...stale].slice(0, 20).map(([en]) => `      - "${en}"`),
  stale.length > 20 ? `      … and ${stale.length - 20} more` : '',
  ``,
  `Component scan: ${files.length} files`,
  `  - unique UI string candidates: ${candMap.size}`,
  `  - fully covered: ${candMap.size - worklist.length}`,
  `  - PARTIAL (mixed EN+MM, review): ${partialCount}`,
  `  - UNCOVERED (missing from dict): ${uncoveredCount}`,
  ``,
  `Missing t('...') keys (render raw key in UI): ${missingTKeys.size}`,
  ...[...missingTKeys].sort().map((k) => `    - ${k}`),
  ``,
  conflicts.length
    ? `Conflicts (same English, different Myanmar):\n` +
      conflicts.map(([en, e]) => `  - "${en}"  ->  ${e.mm}`).join('\n')
    : 'No conflicts.',
  ``,
  `Outputs:`,
  `  - translations/translation-dictionary.csv`,
  `  - translations/translation-dictionary.json`,
  `  - translations/manual-translation-worklist.csv`,
].join('\n');

writeFileSync(join(OUT, 'translation-report.txt'), report, 'utf8');
console.log(report);
