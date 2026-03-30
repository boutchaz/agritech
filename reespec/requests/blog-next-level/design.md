# Blog Next Level — Design

## Architecture

```
                    ┌──────────────┐
                    │   Strapi     │
                    │   CMS        │
                    │   (i18n)     │
                    └──────┬───────┘
                           │ fetch content
                           │ + locale param
                    ┌──────▼───────┐
                    │   NestJS     │
                    │              │
                    │ JSON API:    │──── /api/v1/blogs/* (existing, unchanged)
                    │ HTML routes: │──── /blog, /blog/:slug (NEW)
                    │ XML routes:  │──── /sitemap.xml, /rss.xml (NEW)
                    │ POST:        │──── /api/v1/newsletter/subscribe (NEW)
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │        Nginx            │
              │                         │
              │  /blog/*     → NestJS   │  (NEW proxy rule)
              │  /sitemap.xml→ NestJS   │  (NEW proxy rule)
              │  /rss.xml   → NestJS    │  (NEW proxy rule)
              │  /*         → SPA dist/ │  (unchanged)
              └─────────────────────────┘
```

## Key Decisions

### Handlebars for HTML templates
NestJS already has `handlebars@4.7.9` installed for email templates. Reuse the same engine for blog HTML rendering. Templates live in `agritech-api/src/modules/blogs/templates/`.

### New controller, not modifying existing
Create `BlogSsrController` at path prefix `/blog` (no `/api/v1` prefix) alongside existing `BlogsController` at `/api/v1/blogs`. Existing JSON API is untouched — SPA frontend still works during transition.

### Locale routing
- URL pattern: `/blog/:slug?lang=fr` (query param, default `fr`)
- Alternative considered: `/fr/blog/:slug` — rejected because it adds routing complexity and Strapi i18n works via query param anyway
- Blog nav shows language switcher linking to same page with different `?lang=`

### Newsletter subscribers table
- New Supabase table: `newsletter_subscribers`
- Columns: `id`, `email` (unique), `locale`, `source_slug`, `subscribed_at`, `confirmed` (default false)
- No `organization_id` — this is public, not tenant-scoped
- No RLS needed — accessed only via NestJS service account
- Double opt-in: store email, mark `confirmed=false`. Confirmation email is Phase 3 (when email budget exists).

### Nginx routing change
Add `location` blocks for `/blog`, `/sitemap.xml`, `/rss.xml` that proxy to NestJS (port 3001). All other routes continue to serve the SPA. This is the only infrastructure change — same Docker containers, same docker-compose.

### Blog page design
- Own lightweight nav: logo (→ /), "Blog" link, categories dropdown (CSS-only), language switcher, CTA button
- No React, no JS frameworks — pure HTML + CSS rendered by Handlebars
- Minimal JS only for: mobile nav toggle, copy-link button, newsletter form submit
- Mobile-first, works on 3G
- AgroGina green palette (#22c55e / #16a34a / #15803d)
- Article page: sticky sidebar with TOC + newsletter CTA + demo CTA

### Social share
- LinkedIn, X (Twitter), Facebook share buttons with proper brand SVG icons
- Copy link button
- OG tags per page: og:title, og:description, og:image, og:type=article, og:locale
- Twitter card: summary_large_image

### SEO
- JSON-LD `Article` schema on detail pages
- JSON-LD `Blog` schema on listing page
- `<link rel="canonical">` on every page
- `sitemap.xml` generated dynamically from Strapi (all published posts, all locales)
- `rss.xml` with latest 20 posts

## Risks

| Risk | Mitigation |
|------|-----------|
| Strapi API slow → blog pages slow | Cache Strapi responses in NestJS (5-min TTL via simple in-memory cache or NestJS CacheModule) |
| Handlebars templates hard to maintain | Keep templates simple, use partials for reusable components (nav, footer, CTA) |
| Nginx config change breaks SPA routing | Test thoroughly — `/blog` goes to NestJS, everything else to SPA. Order matters in nginx config. |
| SEO crawlers see different content than users | This is intentional and acceptable — crawlers see server-rendered HTML, users currently see SPA. Over time, all blog traffic shifts to server-rendered pages. |

## File Structure (new files)

```
agritech-api/src/modules/blogs/
├── blogs.controller.ts          (existing — JSON API, unchanged)
├── blogs.service.ts             (existing — add locale param to Strapi calls)
├── blogs.module.ts              (existing — register new controller + service)
├── blog-ssr.controller.ts       (NEW — HTML routes)
├── blog-ssr.service.ts          (NEW — template rendering)
├── newsletter.controller.ts     (NEW — POST /api/v1/newsletter/subscribe)
├── newsletter.service.ts        (NEW — Supabase insert)
├── dto/
│   ├── blog-filters.dto.ts      (existing)
│   └── subscribe-newsletter.dto.ts (NEW)
└── templates/
    ├── layouts/
    │   └── base.hbs             (HTML shell: head, meta, nav, footer)
    ├── partials/
    │   ├── nav.hbs              (lightweight blog nav)
    │   ├── footer.hbs           (footer with links + newsletter)
    │   ├── blog-card.hbs        (article card component)
    │   ├── cta-newsletter.hbs   (newsletter signup form)
    │   ├── cta-demo.hbs         (book a demo banner)
    │   ├── social-share.hbs     (share buttons with brand icons)
    │   └── json-ld.hbs          (structured data partial)
    ├── blog-list.hbs            (listing page)
    └── blog-detail.hbs          (article page)

project/supabase/migrations/
└── 00000000000000_schema.sql    (add newsletter_subscribers table)
```
