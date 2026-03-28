# Spec: Button Replacement

## Capability: All raw `<button>` elements replaced with shadcn `<Button>`

### Scenario: Standard action buttons use Button component
- **GIVEN** a file with `<button className="...bg-green-600...">Add</button>`
- **WHEN** the replacement pass is applied
- **THEN** it becomes `<Button>Add</Button>` with appropriate variant, and the file imports `Button` from `@/components/ui/button`

### Scenario: Icon-only buttons have aria-label
- **GIVEN** a file with `<button><Grid className="h-4 w-4" /></button>` (no visible text)
- **WHEN** the replacement pass is applied
- **THEN** it becomes `<Button size="icon" variant="ghost" aria-label={t('...')}><Grid /></Button>`

### Scenario: Filter chips use variant swap
- **GIVEN** a file with buttons that toggle className based on active state
- **WHEN** the replacement pass is applied
- **THEN** they use `<Button variant={active ? "default" : "outline"}>` pattern

### Scenario: Form submit buttons preserve type
- **GIVEN** a file with `<button type="submit">Save</button>` inside a form
- **WHEN** the replacement pass is applied
- **THEN** it becomes `<Button type="submit">Save</Button>` (type preserved)

### Scenario: No raw button elements remain
- **GIVEN** a file that was part of the replacement pass
- **WHEN** checked with `grep "<button"`
- **THEN** returns zero matches (except inside `components/ui/`)

### Scenario: TypeScript compiles cleanly
- **GIVEN** all files have been updated
- **WHEN** `tsc --noEmit` is run
- **THEN** no type errors related to the changed files
