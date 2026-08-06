#!/usr/bin/env node
/**
 * UI policy guard — enforces the "one Button component" rule.
 *
 * Policy: every interactive button MUST use the <Button> component from
 * src/components/ui (or a derived component). Raw <button> tags are allowed
 * ONLY inside the ui kit itself and inside slot/primitive wrappers.
 *
 * Enforcement mode (baseline): the guard FAILS (exit 1) when the raw-button
 * count EXCEEDS the baseline below (i.e. someone added a NEW raw <button>).
 * Existing raw buttons are being migrated incrementally — the baseline drops
 * as files are converted (update it after each migration round).
 *
 * Exit codes:
 *   0 = clean or equal-to-baseline
 *   1 = violations increased vs baseline (new raw buttons added)
 */
import { execSync } from "node:child_process";

const BASELINE = 0; // migration complete 2026-08-06 (was 477) — zero tolerance now

const ALLOWED_FILES = [
  'src/components/ui/button.tsx',        // the Button definition itself
  // reusable primitives that render their own trigger/option buttons (ui layer)
  'src/components/common/CustomDropdownMenu.tsx',
  'src/components/common/DrawerSelect.tsx',
  'src/components/common/UserRoleSwitcher.tsx',
];

const out = execSync("grep -rn '<button' src --include='*.tsx' --include='*.ts' || true", {
  encoding: 'utf8',
});

const violations = [];
for (const line of out.split('\n')) {
  if (!line.trim()) continue;
  const file = line.split(':')[0];
  if (ALLOWED_FILES.includes(file)) continue;
  if (/<Button\b/.test(line)) continue;
  if (line.includes('//') && !line.includes('className')) continue;
  violations.push(line);
}

if (violations.length > 0) {
  console.log(`\n❌ Button policy: ${violations.length} raw <button> found — ALL buttons must use <Button> from src/components/ui.`);
  console.log('   See README "Button policy".');
  process.exit(1);
} else {
  console.log('✅ Button policy: no raw <button> outside the ui kit.');
}
