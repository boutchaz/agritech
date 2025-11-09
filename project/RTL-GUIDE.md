# RTL (Right-to-Left) Styling Guide

This project supports RTL languages (Arabic) with automatic layout flipping. Use these utilities for RTL-aware spacing and layout.

## How RTL Works

The document direction is automatically set based on the selected language:
- **English/French**: `dir="ltr"` (Left-to-Right)
- **Arabic**: `dir="rtl"` (Right-to-Left)

This is handled automatically by the `LanguageSwitcher` component.

## RTL-Aware Spacing Utilities

### Margin Utilities

Use logical properties instead of left/right-specific margins:

| Class | Property | Description |
|-------|----------|-------------|
| `ms-{size}` | `margin-inline-start` | Left margin in LTR, Right margin in RTL |
| `me-{size}` | `margin-inline-end` | Right margin in LTR, Left margin in RTL |
| `mx-{size}` | `margin-inline` | Horizontal margins (both sides) |

**Examples:**
```jsx
// ❌ Don't use (won't flip in RTL)
<div className="ml-4">Content</div>

// ✅ Do use (automatically flips)
<div className="ms-4">Content</div>
```

### Padding Utilities

| Class | Property | Description |
|-------|----------|-------------|
| `ps-{size}` | `padding-inline-start` | Left padding in LTR, Right padding in RTL |
| `pe-{size}` | `padding-inline-end` | Right padding in LTR, Left padding in RTL |
| `px-{size}` | `padding-inline` | Horizontal padding (both sides) |

**Examples:**
```jsx
// ❌ Don't use
<button className="pl-6 pr-3">Button</button>

// ✅ Do use
<button className="ps-6 pe-3">Button</button>
```

### Available Sizes

All Tailwind spacing scale values are supported:
- `0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, `36`, `40`, `44`, `48`, `52`, `56`, `60`, `64`, `72`, `80`, `96`
- Special: `auto` (for margins only)

## Text Alignment

| Class | Property | Description |
|-------|----------|-------------|
| `text-start` | `text-align: start` | Left in LTR, Right in RTL |
| `text-end` | `text-align: end` | Right in LTR, Left in RTL |
| `text-center` | `text-align: center` | Center (works in both) |

**Examples:**
```jsx
// ❌ Don't use
<p className="text-left">Text</p>

// ✅ Do use
<p className="text-start">Text</p>
```

## Flexbox Layout

Flexbox `justify-content` and `align-items` automatically respect `dir` attribute:

```jsx
// These work correctly in RTL
<div className="flex justify-start">   {/* Items align to start (left in LTR, right in RTL) */}
<div className="flex justify-end">     {/* Items align to end (right in LTR, left in RTL) */}
<div className="flex items-start">     {/* Align to top */}
<div className="flex items-end">       {/* Align to bottom */}
```

## Icons and Visual Elements

For icons that should flip in RTL (arrows, chevrons), consider using CSS transform:

```jsx
// Icon that flips in RTL
<ChevronRight className="rtl:rotate-180" />

// Icon that should NOT flip (logos, symbols)
<Logo className="ltr:ml-2 rtl:mr-2" />
```

## Common Patterns

### Card with Icon
```jsx
// ❌ Don't use
<div className="flex items-center">
  <Icon className="mr-3" />
  <span>Text</span>
</div>

// ✅ Do use
<div className="flex items-center gap-3">
  <Icon />
  <span>Text</span>
</div>
// OR with logical properties
<div className="flex items-center">
  <Icon className="me-3" />
  <span>Text</span>
</div>
```

### Form Label and Input
```jsx
// ✅ Good pattern
<div className="space-y-2">
  <label className="text-start">Label</label>
  <input className="w-full ps-3 pe-3" />
</div>
```

### Navigation Items
```jsx
// ✅ Good pattern
<nav className="flex gap-4">
  <a className="ps-2 pe-2">Link 1</a>
  <a className="ps-2 pe-2">Link 2</a>
</nav>
```

### Sidebar Layout
```jsx
// ✅ Good pattern
<div className="flex">
  <aside className="me-6">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

## Testing RTL

To test your RTL layouts:

1. Switch to Arabic in the language selector
2. Check that:
   - Text aligns to the right
   - Spacing flips correctly
   - Icons point in the correct direction
   - Navigation flows right-to-left
   - Modals and dialogs align properly

## Migration Guide

When updating existing components:

1. **Replace `ml-*` with `ms-*`** (margin-left → margin-start)
2. **Replace `mr-*` with `me-*`** (margin-right → margin-end)
3. **Replace `pl-*` with `ps-*`** (padding-left → padding-start)
4. **Replace `pr-*` with `pe-*`** (padding-right → padding-end)
5. **Replace `text-left` with `text-start`**
6. **Replace `text-right` with `text-end`**
7. **Use `gap-*` for flex/grid spacing** instead of margins when possible

## Best Practices

1. ✅ **Prefer `gap-*` for spacing between flex/grid items**
2. ✅ **Use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`)**
3. ✅ **Use `text-start` and `text-end` instead of `text-left`/`text-right`**
4. ✅ **Test with Arabic language regularly**
5. ❌ **Avoid fixed left/right properties**
6. ❌ **Don't use `float-left` or `float-right`** (use flexbox instead)

## Resources

- [CSS Logical Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [RTL Styling Best Practices](https://rtlstyling.com/)
