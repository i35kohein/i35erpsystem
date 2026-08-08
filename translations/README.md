# Translation Dictionary — i35 RepairDesk Pro ERP

Auto-generated translation files for the Myanmar (မြန်မာ) UI. Rebuild with:

```bash
node scripts/build-translation-dictionary.mjs
```

## Files

| File | Purpose |
|------|---------|
| `translation-dictionary.csv` | **Master dictionary** — every English phrase with its current Myanmar translation (463 entries). Edit here to fix/improve existing translations, then merge changes back into `src/lib/domTranslate.ts` and/or `src/data/translations.ts`. |
| `translation-dictionary.json` | Same dictionary as JSON (EN → MM map), for tooling. |
| `manual-translation-worklist.csv` | **Worklist for manual translation** — English strings found in the UI components that are missing from the dictionary (`uncovered`) or only partly translated (`partial`). Fill in the Myanmar column, then add the entries to the dictionary files. |
| `translation-report.txt` | Build summary: counts, duplicate/conflicting translations, missing `t()` keys. |

## Manual translation workflow

1. Open `manual-translation-worklist.csv` in Excel / Google Sheets (UTF-8, BOM included so Myanmar renders correctly).
2. Sort by `Coverage` — fix `uncovered` first, then `partial`.
   - `uncovered` = no dictionary entry matches → needs a new EN→MM entry.
   - `partial` = partly translated; the `Leftover EN (review)` column shows which English words remain.
   - Strings whose leftovers are only tech terms (iPhone, IMEI, MMK, SKU, QR…) are **intentionally** kept in English — no work needed.
3. Fill the `Myanmar (fill in)` column.
4. Add new entries to `src/lib/domTranslate.ts` (flat `['English', 'မြန်မာ']` pairs) for hardcoded UI text, or to `src/data/translations.ts` (keyed `{ en, mm }`) for strings rendered through `t()`.
5. Rebuild → the string should move out of the worklist.

## Notes

- `domTranslate.ts` applies longest-match-first, so longer phrases must be added alongside short ones (e.g. both `"Customer Name *"` and `"Customer Name"`).
- Tech terms stay English by policy: iPhone, iPad, MacBook, IMEI, Serial, QR, POS, QA, RMA, SKU, Passcode, MMK, AI, etc.
- Duplicate English strings with **different** Myanmar translations are flagged `⚠CONFLICT(...)` in the dictionary CSV — resolve those first.
