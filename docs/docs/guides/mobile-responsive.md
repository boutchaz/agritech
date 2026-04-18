---
sidebar_position: 4
title: "Mobile Responsive Guidelines"
---

# Mobile-Responsive Implementation Prompt

## Tech Stack

**Main Frontend Application (project/):**
- React 19 with Vite
- TanStack Router (file-based routing)
- Tailwind CSS v3
- Radix UI components (shadcn/ui style)
- TypeScript

**Marketplace Frontend (marketplace-frontend/):**
- Next.js 16.1.0
- Tailwind CSS v4
- TypeScript

## Current State

- Desktop-first design, mobile views need optimization
- Sidebar already has mobile hamburger menu implementation (`isMobileMenuOpen` state)
- Some responsive utilities exist (`lg:hidden`, `lg:flex`, etc.) but not consistently applied
- Fixed sidebar with margin-based layout on desktop

## Requirements

### 1. Responsive Breakpoints (Mobile-First Approach)
- **Mobile**: `< 640px` (default, no prefix)
- **Tablet**: `640px - 1024px` (`sm:`, `md:`)
- **Desktop**: `> 1024px` (`lg:`, `xl:`, `2xl:`)

### 2. Key Adjustments Needed Across All Screens

#### Navigation
- ✅ Hamburger menu on mobile (already implemented in `Sidebar.tsx`)
- Ensure sidebar overlay works correctly on all screen sizes
- Mobile menu should close on navigation
- Consider bottom navigation bar for mobile (optional)

#### Tables
- Horizontal scroll wrapper on mobile: `<div className="overflow-x-auto -mx-4 sm:mx-0">`
- Card layout alternative for mobile (convert table rows to cards)
- Stack columns vertically on mobile
- Hide less important columns on mobile

#### Forms
- Full-width inputs on mobile: `w-full sm:w-auto`
- Stack labels above inputs: `flex-col sm:flex-row`
- Reduce padding: `p-4 sm:p-6`
- Full-width buttons on mobile: `w-full sm:w-auto`
- Consider using `Drawer` component from `@/components/ui/drawer` for mobile forms instead of `Dialog`

#### Modals/Dialogs
- Full-screen on mobile: Use `Drawer` component for mobile, `Dialog` for desktop
- Or make `Dialog` full-screen on mobile: `max-w-full sm:max-w-lg` with `h-screen sm:h-auto`
- Ensure proper padding: `p-4 sm:p-6`

#### Typography
- Scalable font sizes: `text-sm sm:text-base lg:text-lg`
- Line height adjustments: `leading-tight sm:leading-normal`
- Truncate long text on mobile: `truncate` or `line-clamp-2`

#### Spacing
- Reduced padding/margins on mobile: `p-2 sm:p-4 lg:p-6`
- Tighter gaps: `gap-2 sm:gap-4`
- Container padding: `px-4 sm:px-6 lg:px-8`

#### Images
- Responsive sizing: `w-full h-auto` or `object-cover`
- Aspect ratio containers: `aspect-video`, `aspect-square`
- Lazy loading for mobile

#### Grids
- Single column on mobile: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Stack flex items: `flex-col sm:flex-row`

#### Layout Components
- Sidebar margin adjustment (already handled by `useSidebarMargin` hook)
- Main content should be full-width on mobile (no sidebar margin)
- Consider sticky headers on mobile for long lists

### 3. Screens to Adjust

#### Core Screens
- [ ] Dashboard (`/dashboard`) - Grid layouts, charts, cards
- [ ] Farm Hierarchy (`/farm-hierarchy`) - Tree view, nested lists
- [ ] Parcels (`/parcels`) - Map integration, table/card views
- [ ] Stock Management (`/stock`) - Tables, forms, modals
- [ ] Infrastructure (`/infrastructure`) - Lists, detail views

#### List/Table Views
- [ ] Workers (`/workers`) - DataTable component
- [ ] Tasks (`/tasks`) - Task list, filters
- [ ] Harvests (`/harvests`) - Harvest records table
- [ ] Stock Entries (`/stock/entries`) - StockEntryList component
- [ ] Items (`/stock/items`) - ItemManagement component

#### Detail Pages
- [ ] Parcel detail - Map, forms, tabs
- [ ] Worker detail - Profile, assignments
- [ ] Stock entry detail - Form, items list
- [ ] Task detail - Form, assignments

#### Forms
- [ ] Stock Entry Form (`StockEntryForm.tsx`) - Complex multi-step form
- [ ] Item Management forms - Create/Edit modals
- [ ] Worker forms - Profile, assignments
- [ ] Parcel creation/editing - Map integration

#### Settings
- [ ] Settings pages (`/settings/*`) - Profile, preferences
- [ ] Organization settings
- [ ] User management

#### Auth Pages
- [ ] Login (`/login`) - Form layout
- [ ] Signup (if exists) - Multi-step forms

### 4. Reusable Responsive Utilities

#### Container Component
```tsx
// Responsive container with consistent padding
<div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
  {children}
</div>
```

#### Responsive Grid
```tsx
// Card grid that adapts to screen size
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>
```

#### Responsive Table Wrapper
```tsx
// Table with horizontal scroll on mobile
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle sm:px-0">
    <Table>{/* table content */}</Table>
  </div>
</div>
```

#### Mobile-First Dialog/Drawer
```tsx
// Use Drawer on mobile, Dialog on desktop
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

const isMobile = useMediaQuery('(max-width: 640px)');

{isMobile ? (
  <Drawer open={open} onOpenChange={setOpen}>
    <DrawerContent>{content}</DrawerContent>
  </Drawer>
) : (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>{content}</DialogContent>
  </Dialog>
)}
```

#### Responsive Text
```tsx
// Scalable typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  {title}
</h1>
<p className="text-sm sm:text-base text-gray-600">
  {description}
</p>
```

### 5. Mobile-First Tailwind Patterns

#### Spacing Scale
- Mobile: `p-2`, `gap-2`, `m-2`
- Tablet: `sm:p-4`, `sm:gap-4`, `sm:m-4`
- Desktop: `lg:p-6`, `lg:gap-6`, `lg:m-6`

#### Typography Scale
- Mobile: `text-sm`, `text-base`
- Tablet: `sm:text-base`, `sm:text-lg`
- Desktop: `lg:text-lg`, `lg:text-xl`

#### Layout Patterns
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">
  <div className="flex-1">Left</div>
  <div className="flex-1">Right</div>
</div>

// Full width on mobile, constrained on desktop
<div className="w-full lg:max-w-4xl lg:mx-auto">
  {content}
</div>

// Hide on mobile, show on desktop
<div className="hidden lg:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">Mobile only</div>
```

### 6. Component-Specific Adjustments

#### DataTable Component
- Horizontal scroll wrapper
- Card layout option for mobile
- Sticky header on mobile
- Compact row height on mobile

#### Forms (React Hook Form + Zod)
- Stack form fields vertically on mobile
- Full-width inputs on mobile
- Inline labels on desktop, above on mobile
- Full-width submit buttons on mobile

#### Maps (OpenLayers)
- Full viewport height on mobile
- Simplified controls on mobile
- Touch-friendly interactions

#### Charts (ECharts, Recharts)
- Responsive container: `w-full h-64 sm:h-80 lg:h-96`
- Simplified legends on mobile
- Touch-friendly tooltips

### 7. Testing Checklist

- [ ] Test on actual mobile devices (iOS Safari, Chrome Android)
- [ ] Test on tablet sizes (iPad, Android tablets)
- [ ] Test landscape orientation
- [ ] Test touch interactions (swipe, tap, long-press)
- [ ] Test form inputs (keyboard, autocomplete)
- [ ] Test modals/dialogs (scroll behavior, close actions)
- [ ] Test tables (horizontal scroll, card layout)
- [ ] Test navigation (sidebar, hamburger menu)
- [ ] Test RTL layout on mobile (Arabic)
- [ ] Test dark mode on mobile

### 8. Performance Considerations

- Lazy load images on mobile
- Reduce initial bundle size
- Code split routes
- Optimize chart rendering on mobile
- Debounce scroll/resize handlers
- Use `will-change` sparingly

## Implementation Priority

1. **High Priority** (Core UX)
   - Navigation (sidebar mobile menu)
   - Forms (all create/edit forms)
   - Tables (convert to mobile-friendly)
   - Dashboard layout

2. **Medium Priority** (Common screens)
   - List views
   - Detail pages
   - Settings pages
   - Auth pages

3. **Low Priority** (Polish)
   - Animations
   - Advanced interactions
   - Edge cases

## Example: Converting a Screen

**Before (Desktop-only):**
```tsx
<div className="p-6">
  <h1 className="text-3xl font-bold mb-6">Title</h1>
  <div className="grid grid-cols-3 gap-6">
    <Card>Item 1</Card>
    <Card>Item 2</Card>
    <Card>Item 3</Card>
  </div>
</div>
```

**After (Mobile-responsive):**
```tsx
<div className="p-4 sm:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
    Title
  </h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
    <Card>Item 1</Card>
    <Card>Item 2</Card>
    <Card>Item 3</Card>
  </div>
</div>
```

---

## Current Screen to Adjust

**Screen Name:** [Specify the screen/component]

**File Path:** `project/src/[path-to-file]`

**Current Code:**
```tsx
[paste current code here]
```

**Specific Issues:**
- [ ] Navigation not working on mobile
- [ ] Tables overflow on mobile
- [ ] Forms are too cramped
- [ ] Modals are too small/large
- [ ] Text is too small/large
- [ ] Spacing is inconsistent
- [ ] Images don't scale
- [ ] Grids don't stack on mobile
- [ ] Other: [describe]

**Expected Behavior:**
- [Describe how it should work on mobile/tablet/desktop]
