# Blog Next Level

## Problem
The AgroGina blog exists but is invisible to search engines and social media crawlers. It's a client-side rendered SPA — LinkedIn/Facebook/Twitter previews show generic "AgriTech" metadata instead of article-specific titles, images, and excerpts. The newsletter is fake (setTimeout). Social share icons use generic Lucide icons. No structured data, no sitemap, no RSS feed. No conversion path from reader → AgroGina signup.

## Goal
Transform the blog into a **lead generation + authority building** engine for Moroccan ag-tech. When someone shares an article on LinkedIn, it should show a rich preview with the article title, excerpt, and featured image. Google should index every article. Readers should have a clear path to becoming AgroGina users.

## Approach
Add server-rendered HTML routes in NestJS for blog pages. NestJS already runs, already talks to Strapi, already has the blog data layer. No new services, no new frameworks — just new routes that return HTML instead of JSON. Handlebars is already installed in the project for email templates — reuse the same engine for blog HTML templates.

## Scope
- **Phase 1 — SEO & Social Foundation**: NestJS HTML routes with OG tags, JSON-LD, sitemap.xml, RSS feed, Nginx routing change
- **Phase 2 — Design & UX Overhaul**: Modern typography, proper social brand icons, CTA sections for signup conversion, real newsletter backend
- **Phase 3 — Future extraction**: If blog grows significantly, extract to dedicated service

## Conversion Strategy
- **Primary CTA**: Newsletter signup (email → Supabase `newsletter_subscribers` table, zero cost)
- **Secondary CTA**: Book a demo (link to demo booking)
- **Tertiary CTA**: Free trial (always visible in nav)

## Languages
- French, Arabic, English — content managed via Strapi i18n plugin
- NestJS passes locale param when fetching from Strapi
- Blog nav and static UI strings rendered per locale

## Out of Scope
- Full SPA-to-SSR migration (TanStack Start)
- Replacing Strapi CMS
- Comment system (not yet)
- Blog admin in AgroGina dashboard
- External newsletter service (Mailchimp, etc.) — store emails only for now
- LinkedIn auto-posting (share buttons only)
