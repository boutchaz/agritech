# UI Consistency — Design

## Approach

Systematic file-by-file replacement of raw `<button>` elements with shadcn `<Button>`, grouped by area of the app. Each group is a task that can be verified independently via TypeScript compilation and a focused grep check.

## Replacement Rules

### 1. Standard buttons (CTA, actions)

**Before:**
```tsx
<button onClick={fn} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
  <Plus className="w-5 h-5" /> Add Item
</button>
```

**After:**
```tsx
<Button onClick={fn}>
  <Plus className="w-5 h-5" /> Add Item
</Button>
```

- Drop all hand-rolled padding, bg-color, rounded, hover classes
- Map to appropriate `variant` based on intent (see brief.md mapping table)
- Keep custom color `className` overrides only when the design system variant doesn't match (e.g., status-specific colors like amber for "Pause")

### 2. Outline / secondary buttons

**Before:**
```tsx
<button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
```

**After:**
```tsx
<Button variant="outline">
```

### 3. Icon-only buttons

**Before:**
```tsx
<button onClick={fn} className="p-2 rounded-md" title="Vue groupée">
  <Grid className="h-4 w-4" />
</button>
```

**After:**
```tsx
<Button size="icon" variant="ghost" onClick={fn} aria-label={t('common.groupedView', 'Grouped view')}>
  <Grid className="h-4 w-4" />
</Button>
```

- Always add `aria-label` (translated)
- Remove `title` if `aria-label` covers it, or keep both

### 4. Filter chips (variant swap)

**Before:**
```tsx
<button
  onClick={() => setFilter('all')}
  className={`px-3 py-1.5 rounded-lg text-sm ${
    filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
  }`}
>All</button>
```

**After:**
```tsx
<Button
  size="sm"
  variant={filter === 'all' ? 'default' : 'outline'}
  onClick={() => setFilter('all')}
>{t('common.all', 'All')}</Button>
```

### 5. View mode toggles (icon group)

**Before:**
```tsx
<div className="flex bg-gray-100 rounded-lg p-1">
  <button className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}>
    <Grid className="h-4 w-4" />
  </button>
  ...
</div>
```

**After:**
```tsx
<div className="flex items-center gap-1">
  <Button size="icon" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} aria-label={t('common.gridView', 'Grid view')}>
    <Grid className="h-4 w-4" />
  </Button>
  ...
</div>
```

### 6. Section-level tabs → `<Tabs>` component

**Before:**
```tsx
<div className="flex border-b">
  <button className={`px-4 py-2 ${tab === 'overview' ? 'border-b-2 border-blue-600' : ''}`}>
    Overview
  </button>
  <button className={`px-4 py-2 ${tab === 'details' ? 'border-b-2 border-blue-600' : ''}`}>
    Details
  </button>
</div>
{tab === 'overview' && <OverviewContent />}
{tab === 'details' && <DetailsContent />}
```

**After:**
```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="overview">{t('common.overview', 'Overview')}</TabsTrigger>
    <TabsTrigger value="details">{t('common.details', 'Details')}</TabsTrigger>
  </TabsList>
  <TabsContent value="overview"><OverviewContent /></TabsContent>
  <TabsContent value="details"><DetailsContent /></TabsContent>
</Tabs>
```

## i18n Strategy

- Button text → `t('namespace.key', 'English fallback')`
- Use `common` namespace for shared labels (Save, Cancel, Add, Delete, Close, etc.)
- Use domain namespace for domain-specific labels (e.g., `stock.addItem`, `tasks.start`)
- `aria-label` values also go through `t()`
- Add keys to all 3 locale files: `en/`, `fr/`, `ar/`

## Import Convention

Every file that gets a `<Button>` swap needs:
```tsx
import { Button } from '@/components/ui/button';
```

Files converting to Tabs need:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

Only add imports that aren't already present.

## Verification Strategy

Each task group is verified by:
1. **Grep check**: `grep -rn "<button" <files>` returns 0 matches (no raw buttons left)
2. **TypeScript**: `tsc --noEmit` passes (no type errors from wrong props)
3. **Import check**: all files import `Button` from the correct path

## Risks

- **Behavioral regression**: raw buttons may have `type="submit"` in forms — `<Button>` defaults to `type="button"` via the underlying HTML button. Must preserve `type="submit"` where needed.
- **CSS specificity**: some raw buttons have dark mode classes (`dark:bg-gray-700`) that the Button component handles via variant. Removing them should be safe, but edge cases possible.
- **Conditional rendering**: some buttons are inside complex ternaries — surgical edits needed.
