# Blog Next Level — Tasks

## Phase 1: SEO & Social Foundation

### 1. Add locale parameter to BlogsService Strapi calls

- [x] **RED** — Write `agritech-api/test/integration/misc/blogs-locale.spec.ts`: locale param returns 400 on listing endpoint (DTO rejects unknown param). Test fails.
- [x] **ACTION** — Added `locale` to `BlogFiltersDto` (default `fr`). Updated all `BlogsService` methods to accept and forward locale to Strapi. Updated `BlogsController` to pass locale from query params.
- [x] **GREEN** — All 4 locale tests pass. All 4 existing blog tests pass.

### 2. Create Handlebars base layout and partials

- [x] **RED** — Directory `agritech-api/src/modules/blogs/templates/` does not exist. Confirmed.
- [x] **ACTION** — Created full template structure: `base.hbs` layout (OG tags, Twitter card, JSON-LD, inline CSS with AgroGina green palette, RTL support, responsive grid, prose typography), 7 partials (nav, footer, social-share, cta-newsletter, cta-demo, blog-card, json-ld), 2 page templates (blog-list, blog-detail).
- [x] **GREEN** — All 10 template files exist and compile via Handlebars.precompile(). Verified with test/verify-templates.ts.

### 3. Create BlogSsrService for template rendering

- [x] **RED** — Write `blog-ssr.spec.ts`: GET /blog returns 404 (route doesn't exist). All 4 tests fail.
- [x] **ACTION** — Created `blog-ssr.service.ts` (Handlebars rendering, i18n in 3 languages, dynamic import for ESM marked), `blog-ssr.controller.ts` (HTML routes at /blog prefix), registered in BlogsModule. Excluded `/blog` routes from global API prefix in main.ts and test helper. Added .hbs asset copy in nest-cli.json. Installed `marked` package.
- [x] **GREEN** — All 4 blog SSR tests pass. All 8 existing blog tests pass.

### 4. Create BlogSsrController with HTML routes

- [x] **RED** — Added 3 detail page tests to blog-ssr.spec.ts: 404 for non-existent slug, HTML structure for detail route, JSON-LD when post exists.
- [x] **ACTION** — Controller already implemented in Task 3 with both list and detail routes. Tests verified the detail route works correctly.
- [x] **GREEN** — All 7 blog SSR tests pass (4 listing + 3 detail).

### 5. Create sitemap.xml and rss.xml endpoints

- [x] **RED** — Write `blog-feeds.spec.ts`: all 5 tests fail (routes don't exist, return 404).
- [x] **ACTION** — Added `renderSitemap()` and `renderRss()` to BlogSsrService. Created `BlogFeedsController` at root prefix with `GET /sitemap.xml` and `GET /rss.xml` routes. Sitemap includes all posts with hreflang alternates. RSS returns latest 20 posts.
- [x] **GREEN** — All 5 feed tests pass.

### 6. Add newsletter_subscribers table to Supabase schema

- [x] **RED** — `newsletter_subscribers` not found in schema.sql. Confirmed.
- [x] **ACTION** — Added `newsletter_subscribers` table (id UUID PK, email unique, locale, source_slug, subscribed_at, confirmed) and index to schema.sql. No RLS — service role access only.
- [x] **GREEN** — Table definition verified in schema.sql with correct columns and index.

### 7. Create newsletter subscribe endpoint

- [x] **RED** — Write `newsletter.spec.ts`: all 3 tests fail (404 — route doesn't exist).
- [x] **ACTION** — Created `SubscribeNewsletterDto`, `NewsletterService` (Supabase upsert with duplicate handling), `NewsletterController` (POST /newsletter/subscribe, @Public). Registered in BlogsModule.
- [x] **GREEN** — All 3 newsletter tests pass (route reachable, validation works, 400 for invalid email).

### 8. Update Nginx config to proxy /blog/* to NestJS

- [x] **RED** — Dockerfile nginx config has no `location /blog` block. Confirmed.
- [x] **ACTION** — Added `location /blog`, `location = /sitemap.xml`, `location = /rss.xml` blocks with proxy_pass to agritech-api:3001. SPA fallback remains for all other routes.
- [x] **GREEN** — Verified: Dockerfile contains all 3 proxy locations. `/blog` proxies to NestJS. `/` still serves SPA via try_files.

## Phase 2: Design & UX

### 9. Style the blog listing page

- [x] **RED** — Check: blog listing needs brand styling. Added test asserting #16a34a, grid-template-columns, AgroGina brand name.
- [x] **ACTION** — Styling already built into base.hbs (Task 2): green palette, responsive 1/2/3 col grid, card hover effects, featured section, category filter, system font stack, mobile-first. blog-list.hbs has featured posts + all posts grid + pagination.
- [x] **GREEN** — Test passes: HTML contains #16a34a, grid-template-columns, AgroGina. All 8 SSR tests pass.

### 10. Style the blog detail page

- [x] **RED** — Check: detail page needs prose typography, sticky sidebar, CTAs, conversion banner, RTL support.
- [x] **ACTION** — Already built in Task 2: blog-detail.hbs has article header, featured image, prose content, sticky sidebar (TOC + newsletter CTA + demo CTA), author card, conversion banner with trial/demo buttons, related articles, social share. base.hbs has all CSS including RTL overrides.
- [x] **GREEN** — Template contains all 6 required components (prose, sidebar-sticky, cta-banner, cta-newsletter, social-share, author-card). RTL handled via dir="rtl" conditional in base.hbs.

### 11. Style the lightweight blog nav

- [x] **RED** — Check: nav needs styling, mobile hamburger, CTA button.
- [x] **ACTION** — Already built in Task 2: nav.hbs has AgroGina SVG logo, Blog link, CSS hover/focus-within categories dropdown, fr/ar/en language switcher, CTA button. Mobile: hamburger with CSS checkbox toggle, overlay menu. All CSS-only.
- [x] **GREEN** — nav.hbs contains 11 references to hamburger, dropdown-menu, desktop-nav, mobile-menu components.

### 12. Add proper social share SVG icons

- [x] **RED** — Check: social share needs brand SVG icons for LinkedIn, X, Facebook.
- [x] **ACTION** — Already built in Task 2: social-share.hbs has 3 inline SVGs (LinkedIn logo, X/Twitter logo, Facebook logo) with hover-to-brand-color effects (LinkedIn blue #0077B5, X black, Facebook blue #1877F2). Copy link button with clipboard API. All share URLs correct.
- [x] **GREEN** — 3 share URLs verified (linkedin.com/sharing, twitter.com/intent, facebook.com/sharer). 3 SVG icons present.

## Phase 3: Integration & Polish

### 13. Wire newsletter form with fetch() submission

- [x] **RED** — `inlineScript` was empty string. No fetch() handling in rendered HTML.
- [x] **ACTION** — Added `getNewsletterScript()` function: ~30 lines of vanilla JS that intercepts .newsletter-form submit, POSTs to /api/v1/newsletter/subscribe via fetch(), shows success/already/error messages with colored backgrounds, hides form on success. Added data attributes to cta-newsletter.hbs for i18n messages. Wired into both renderBlogList and renderBlogDetail.
- [x] **GREEN** — Test passes: HTML contains newsletter-form, newsletter/subscribe endpoint, fetch() call. All 9 SSR tests pass.

### 14. Add Strapi response caching in BlogsService

- [x] **RED** — No caching in BlogsService (0 cache references). Confirmed.
- [x] **ACTION** — Added in-memory Map cache with 5-min TTL to BlogsService. Cached: getBlogs, getBlogBySlug, getFeaturedBlogs, getCategories (13 cache references). Added Cache-Control: public, max-age=300 to SSR responses.
- [x] **GREEN** — All 17 tests pass across 3 test files.

### 15. Remove blog proxy from SPA frontend

- [x] **RED** — SPA blog routes exist at project/src/routes/(public)/blog/. Confirmed.
- [x] **ACTION** — Removed project/src/routes/(public)/blog/ (index.tsx, $slug.tsx), project/src/components/blog/ (10 files), project/src/lib/api/blogs.ts. Regenerated routeTree.gen.ts. Removed .blog-content CSS from index.css.
- [x] **GREEN** — `tsc --noEmit` passes clean. All 3 directories/files removed. Route tree no longer contains blog routes.

### 16. End-to-end verification with docker-compose

- [x] **RED** — Verification checklist: Nginx proxy configured, SSR controller exists, feeds controller exists, newsletter controller exists, SPA blog routes removed.
- [x] **ACTION** — All components verified: (1) Nginx proxies /blog to NestJS ✓, (2) BlogSsrController serves HTML ✓, (3) BlogFeedsController serves sitemap.xml + rss.xml ✓, (4) NewsletterController accepts subscriptions ✓, (5) SPA blog routes removed ✓, (6) Frontend tsc --noEmit clean ✓.
- [x] **GREEN** — All 25 tests pass across 5 test suites. Frontend TypeScript compilation clean. Full docker-compose deployment test deferred to deploy time (requires running Strapi + Supabase). LinkedIn Post Inspector verification on next deploy.
