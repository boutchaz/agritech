# UI Consistency Pass

## Problem

The app has ~1,100 raw HTML elements (`<button>`, `<input>`, `<select>`, `<table>`, badge-like `<div>`s) spread across 161+ files that bypass the existing shadcn/ui component library. This creates:

- **Visual inconsistency**: buttons look different on every screen — different padding, colors, border-radius, hover states
- **Accessibility gaps**: 638 raw buttons missing `type="button"`, zero `aria-label` on icon-only buttons, no consistent focus ring management
- **i18n violations**: ~35 files with hardcoded French strings in button labels instead of `t('key', 'fallback')`
- **Maintenance burden**: every raw element re-implements styles that the design system already provides

## Scope

### Batch 1: Buttons (this request)
- **161 files, 639 raw `<button>` elements** → replace with shadcn `<Button>`
- Fix i18n violations encountered in those files
- Add accessibility attributes (aria-label, type="button")

### Future batches (separate requests)
- Batch 2: `<input>` (73 files, 216 instances) → `<Input>`
- Batch 3: `<select>` (32 files, 77 instances) → `<Select>`
- Batch 4: `<table>` (57 files) → `<Table>` / DataTable
- Batch 5: badge-like spans/divs (~48 files, 117 instances) → `<Badge>`

## Pattern Decisions

### Variant mapping for raw buttons → `<Button>`

| Raw pattern | Maps to |
|---|---|
| `bg-green-600` / `bg-blue-600` CTA | `variant="default"` |
| `border border-gray-300` outline | `variant="outline"` |
| Icon-only (no text) | `size="icon" variant="ghost"` + `aria-label` |
| Destructive (delete, remove) | `variant="destructive"` |
| Text-only / link-style | `variant="link"` or `variant="ghost"` |

### Filter chips (status filters, toggles)
Use `<Button>` with variant swap: `variant={active ? "default" : "outline"}`.
No new component needed.

### Section-level tab switching (view modes, page sections)
Use existing `<Tabs>` / `<TabsList>` / `<TabsTrigger>` component.

### View mode toggles (grid/list/cards/dashboard icon buttons)
Use `<Button size="icon" variant={active ? "default" : "ghost"}>` with `aria-label`.

### i18n in the same pass
- Replace hardcoded French strings with `t('namespace.key', 'English fallback')`
- Add keys to `en/`, `fr/`, `ar/` locale files
- Use existing namespace conventions from CLAUDE.md

## Constraints

- No new UI components — use only existing shadcn/ui primitives
- Custom color overrides (e.g., `className="text-blue-600 border-blue-600"`) are acceptable on `<Button>` via `className` prop when the design system variants don't cover the use case
- QA: manual, screen by screen after the full pass
- Must not change any behavior — purely visual/accessibility refactor

## Who benefits

- **Ahmed** (no-tech persona): consistent, predictable UI regardless of which screen he's on
- **Karim** (farm manager): accessibility improvements help when using the app under field conditions
- **All users**: proper focus management for keyboard navigation
