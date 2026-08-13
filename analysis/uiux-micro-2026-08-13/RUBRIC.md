# UI/UX Micro-Detail Audit Rubric — 2026-08-13

Audit the assigned source files for UI/UX MICRO-details. This is NOT a bug hunt (no
logic/crash/security) — it is a polish/consistency/experience audit. Go line by line
through the JSX and report concrete micro-detail issues.

## What to look for (checklist)

### Spacing & layout
- Magic numbers / inconsistent padding/margin/gap (e.g. `p-2` vs `p-3` vs `px-5` mixed in same card; hardcoded `style={{ padding: 12 }}`)
- Inconsistent border radius / shadow / border widths between similar components
- Misaligned icon+text pairs (icon not vertically centered, wrong gap)
- Table cell padding inconsistent; cramped density vs airy sections
- Grid/flex gaps that break at small widths

### Typography
- Inconsistent font sizes/weights for same semantic level (title vs subtitle vs body)
- Hardcoded colors vs Tailwind tokens (raw `#` hex, `text-[#...]`, `bg-[#...]`)
- Text truncation missing on long fields (phone, email, ticket ids)
- Tabular numbers for money columns (font-variant-numeric) missing

### States & feedback
- Missing hover/active/focus-visible styles on clickable elements
- Buttons without `disabled` + loading state (spinner) during async ops
- Missing empty states (blank screen when list is empty), missing skeletons
- Silent failures (no toast/error message when save fails)
- Success feedback inconsistent (toast vs inline vs nothing)
- `confirm()`/`alert()` native dialogs instead of styled ones

### Accessibility (a11y)
- Buttons/icon-buttons missing `aria-label` / `title`
- `div` with onClick instead of `<button>` (no keyboard access, no focus)
- Missing `type="button"` on buttons inside forms (accidental submit)
- Low contrast text (gray-on-gray)
- Focus order / focus trap in modals; modal not closing on Esc
- Missing `alt` on images, missing labels on inputs
- Touch targets smaller than ~40px

### Motion & polish
- Missing transitions on hover (color snap vs smooth)
- Missing micro-animations on modal open/close (fade/scale)
- Janky layout shift on data load (no min-height reserved)
- Scroll behavior (lists not scrollable, page jumps)

### Consistency
- Same action styled differently in different modules (Delete = red vs gray vs icon-only)
- Mixed naming/labels for the same concept
- Currency hardcoded `MMK` vs `{currency}` token
- Inconsistent date formatting

## Output format

Write findings to `analysis/uiux-micro-2026-08-13/<area>.md` (create file).
One section per file. Each finding:

```
### <File path>:<line range> — <short title>
- **Severity:** P1 (visible/annoying) | P2 (polish) | P3 (nitpick)
- **Issue:** what's wrong, quote the exact code snippet (short)
- **Suggestion:** concrete fix (exact class/code change where possible)
```

Rules:
- Reference real line numbers (grep the file to verify).
- Be specific, no generic filler. 15–40 findings per file for the big files, fewer for small ones.
- End the file with a 5-line "Top 5 quick wins" section.
- Do NOT modify source files. Read-only audit.
