# Brief: dashboard-skeleton

## Problem

The dashboard page (`/dashboard`) shows a full-page centered spinner (`PageLoader`) while auth/org context loads. This causes:

1. **Layout shift** — blank page with spinner suddenly jumps to full widget grid
2. **Perceived slowness** — no visual hint of what's coming, feels broken on slow 3G/4G (rural Morocco)
3. **Inconsistency** — individual widgets already use proper skeletons, but the page-level guard blocks them from rendering

## Goal

Replace the `PageLoader` spinner with a YouTube-style skeleton shell that mirrors the exact dashboard layout — header (breadcrumbs, title, subtitle) + 3-row widget grid. The skeleton renders instantly, before any data arrives. When org context loads, the page-level skeleton dissolves into widget-level skeletons (already exist), then into real content. Zero layout shift.

## Two-Layer Model

- **Layer 1 (page skeleton)**: Renders when `!currentOrganization`. Shows skeleton header + skeleton widget grid matching the regular dashboard layout (not live mode).
- **Layer 2 (widget skeletons)**: Already implemented in all 8 widgets. Renders when org is ready but individual data is still loading.

Layer 1 → Layer 2 is seamless because both share the same grid structure.

## Non-Goals

- Replacing widget-level skeletons (they stay as-is)
- Handling live dashboard mode skeleton (live mode requires org context to toggle anyway)
- Applying skeletons to other pages (future, page-by-page)
- Changing auth loading behavior

## Impact

- Eliminates layout shift on dashboard initial load
- Better perceived performance for rural users on slow connections
- Sets the pattern for skeleton-first loading across the app
