#!/usr/bin/env node
/**
 * Full UI/UX static audit — scans every src file for:
 *  - font sizes used (named + arbitrary px)
 *  - button heights / paddings / radii / shadows (raw <button> + Button component)
 *  - raw hex colors (design-token debt)
 *  - clickable <div> without role (a11y)
 *  - icon-only buttons without aria-label
 *  - font sizes below the 11px floor
 *  - long lines (maintainability)
 * Emits JSON to stdout for the report builder.
 */
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

const NAMED_SIZES = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 };

const perFile = [];
const totals = {
  hexColors: new Map(),
  fontSizes: new Map(),
  buttonHeights: new Map(),
  buttonPy: new Map(),
  radii: new Map(),
  shadows: new Map(),
  iconButtonsNoLabel: [],
  clickableDivs: [],
  tinyText: [], // < 11px
  longLines: [],
};

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const f = {
    file: rel,
    lines: lines.length,
    fontSizes: new Map(),
    buttonHeights: new Map(),
    buttonPy: new Map(),
    radii: new Map(),
    shadows: new Map(),
    hex: new Map(),
    iconButtonsNoLabel: [],
    clickableDivs: [],
    tinyText: [],
    longLines: [],
  };

  lines.forEach((line, i) => {
    const ln = i + 1;
    // font sizes
    const px = line.match(/text-\[(\d+)px\]/g);
    px?.forEach((m) => {
      const v = parseInt(m.match(/\d+/)[0]);
      f.fontSizes.set(v, (f.fontSizes.get(v) || 0) + 1);
      if (v < 11) f.tinyText.push(`${ln}: ${m}`);
    });
    for (const [name, v] of Object.entries(NAMED_SIZES)) {
      const re = new RegExp(`text-${name}\\b`, 'g');
      if (re.test(line)) {
        f.fontSizes.set(v, (f.fontSizes.get(v) || 0) + 1);
      }
    }
    // hex colors
    const hexes = line.match(/#[0-9a-fA-F]{6}/g);
    hexes?.forEach((h) => f.hex.set(h.toLowerCase(), (f.hex.get(h.toLowerCase()) || 0) + 1));
    // radii + shadows (only inside className contexts — approximate by line match)
    const radii = line.match(/rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full|\[[\d.]+px\]))?/g);
    radii?.forEach((r) => f.radii.set(r, (f.radii.get(r) || 0) + 1));
    const shadows = line.match(/shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|none|\[[^\]]+\]))?/g);
    shadows?.forEach((s) => f.shadows.set(s, (f.shadows.get(s) || 0) + 1));
    // buttons (line contains <button or <Button)
    if (/<(Button|\/button|button)\b/.test(line) || /<Button\b/.test(line)) {
      const hs = line.match(/\bh-(\d+)\b/g);
      hs?.forEach((h) => {
        f.buttonHeights.set(h, (f.buttonHeights.get(h) || 0) + 1);
      });
      const pys = line.match(/\bpy-([\d.]+)\b/g);
      pys?.forEach((p) => {
        f.buttonPy.set(p, (f.buttonPy.get(p) || 0) + 1);
      });
    }
    // icon-only buttons without aria-label
    if (/<button\b/.test(line) && !/aria-label/.test(line)) {
      // heuristic: button line + next 6 lines contain only svg/icon and no text content
      const window = lines.slice(i, Math.min(i + 7, lines.length)).join(' ');
      const hasText = />[A-Za-z][^<]{1,30}</.test(window);
      const hasIcon = /<([A-Z][A-Za-z]+)\s+className="[^"]*(?:h-3|h-3\.5|h-4|w-3|w-4)[^"]*"/.test(window) || /<svg/.test(window);
      if (hasIcon && !hasText) f.iconButtonsNoLabel.push(ln);
    }
    // clickable div without role
    if (/<div\b[^>]*onClick/.test(line) && !/role=/.test(line)) f.clickableDivs.push(ln);
    // long lines
    if (line.length > 220) f.longLines.push(`${ln} (${line.length})`);
  });

  // merge into totals
  f.fontSizes.forEach((c, k) => totals.fontSizes.set(k, (totals.fontSizes.get(k) || 0) + c));
  f.buttonHeights.forEach((c, k) => totals.buttonHeights.set(k, (totals.buttonHeights.get(k) || 0) + c));
  f.buttonPy.forEach((c, k) => totals.buttonPy.set(k, (totals.buttonPy.get(k) || 0) + c));
  f.radii.forEach((c, k) => totals.radii.set(k, (totals.radii.get(k) || 0) + c));
  f.shadows.forEach((c, k) => totals.shadows.set(k, (totals.shadows.get(k) || 0) + c));
  f.hex.forEach((c, k) => totals.hexColors.set(k, (totals.hexColors.get(k) || 0) + c));

  perFile.push({
    file: f.file,
    lines: f.lines,
    fontSizes: [...f.fontSizes.entries()].sort((a, b) => a[0] - b[0]),
    buttonHeights: [...f.buttonHeights.entries()].sort((a, b) => parseInt(a[0].replace(/\D/g, '')) - parseInt(b[0].replace(/\D/g, ''))),
    buttonPy: [...f.buttonPy.entries()],
    radii: [...f.radii.entries()],
    hexCount: f.hex.size,
    iconButtonsNoLabel: f.iconButtonsNoLabel,
    clickableDivs: f.clickableDivs,
    tinyText: f.tinyText,
    longLines: f.longLines,
  });
}

const out = {
  files: perFile,
  totals: {
    hexColors: [...totals.hexColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
    hexDistinct: totals.hexColors.size,
    fontSizes: [...totals.fontSizes.entries()].sort((a, b) => a[0] - b[0]),
    buttonHeights: [...totals.buttonHeights.entries()].sort((a, b) => parseInt(a[0].replace(/\D/g, '')) - parseInt(b[0].replace(/\D/g, ''))),
    buttonPy: [...totals.buttonPy.entries()].sort((a, b) => parseFloat(a[0].replace(/\D/g, '.')) - parseFloat(b[0].replace(/\D/g, '.'))),
    radii: [...totals.radii.entries()].sort((a, b) => b[1] - a[1]),
    shadows: [...totals.shadows.entries()].sort((a, b) => b[1] - a[1]),
  },
  counts: {
    iconButtonsNoLabel: perFile.reduce((a, f) => a + f.iconButtonsNoLabel.length, 0),
    clickableDivs: perFile.reduce((a, f) => a + f.clickableDivs.length, 0),
    tinyText: perFile.reduce((a, f) => a + f.tinyText.length, 0),
    longLines: perFile.reduce((a, f) => a + f.longLines.length, 0),
  },
};
process.stdout.write(JSON.stringify(out, null, 2));
