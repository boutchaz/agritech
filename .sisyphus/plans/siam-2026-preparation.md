# SIAM 2026 Preparation Plan

**Date**: April 12, 2026  
**Event**: Salon International de l'Agriculture au Maroc (SIAM), Meknès  
**Estimated dates**: ~April 21-27, 2026  
**Timeline**: ~9 days  
**Booth**: Medium (12-20m²), 2-4 people  
**Goals**: Farmers (customers), Partners/Distributors, Investors  

---

## Priority Matrix

| Priority | Category | Tasks | Owner | Status |
|----------|----------|-------|-------|--------|
| P0 | Demo readiness | Offline demo, demo data, video fallback | Dev | ⬜ |
| P0 | Lead capture | CRM setup, QR code, form, notifications | Dev | ⬜ |
| P1 | Materials content | One-pager, decks, demo script | CEO | ⬜ |
| P1 | Landing page | siam.agrogina.ma lead capture page | Dev | ⬜ |
| P2 | Follow-up automation | Email templates, sequences | Dev + CEO | ⬜ |
| P2 | Booth operations | Hardware, print, logistics | CEO | ⬜ |

---

## Phase 1: Demo Readiness (P0 — Days 1-3)

### 1.1 Demo Data Seeder

**Goal**: Realistic Moroccan demo organization that showcases the full platform.

**What to build**: A seed script that creates a demo organization in Supabase with:

- **Organization**: "Domaine Toubkal" (fictional, ~320ha near Meknès)
- **Farms**: 3 farms
  - "Ferme Atlas" (180ha) — olive groves, irrigated
  - "Ferme Ziz" (90ha) — citrus, drip irrigation  
  - "Ferme Rif" (50ha) — mixed cereals + olive, rainfed
- **Parcels**: 15-20 parcels across farms with:
  - Real Meknès area coordinates
  - Crop types: olivier (majority), agrumes, blé dur, orge
  - Varieties: Picholine Marocaine, Haouzia, Nocellara
  - Planting years: mix of young (3yr), mid (12yr), mature (35yr)
  - Planting systems: irrigué, pluvial, goutte-à-goutte
  - Areas: 5-40ha each
- **Satellite data**: Pre-loaded calibration outputs for at least 5 parcels
  - NDVI/EVI/NDWI time series (12 months)
  - Completed calibration pipeline results (all 8 steps)
  - Health scores with components
  - Anomaly detection results
  - Zone detection (A-E classes)
- **Harvest records**: 2-3 years of historical yield data
- **Analyses**: Soil + water analysis results for key parcels
- **AgromindIA recommendations**: 3-5 Level 1 actionable recommendations in French
  - "Arrose la parcelle B3 demain avant 8h"
  - "Risque de stress hydrique détecté sur parcelle A1 — vérifiez le système d'irrigation"
  - "Récolte optimale pour parcelle C2 entre le 15 et le 20 octobre"
- **Tasks**: 8-10 active tasks across farms
- **Workers**: 5-6 workers with active assignments
- **Accounting data**: A few invoices, journal entries, cost centers

**Implementation**:
- Script location: `scripts/seed-siam-demo.ts` (or `.sql` for direct Supabase)
- Must be idempotent (can re-run safely)
- Must work against both local and remote Supabase
- Separate organization with a known admin login: `demo@agrogina.ma` / known password

**Files to create/modify**:
- `scripts/seed-siam-demo.ts` — main seeder script
- `scripts/siam-demo-data/` — static JSON data files
- May need to reference existing seed patterns in codebase

**Acceptance criteria**:
- [ ] Demo org loads in the app with all data visible
- [ ] Satellite/NDVI maps render with real-looking data
- [ ] Calibration results display correctly (all 8 steps)
- [ ] AgromindIA recommendations appear in French
- [ ] Can navigate farm → parcel → satellite → calibration → recommendations
- [ ] Works on both staging and production Supabase

**QA Scenario**:
1. **Tool**: Browser (Chrome DevTools) + psql / Supabase Dashboard
2. **Steps**:
   a. Run `npx ts-node scripts/seed-siam-demo.ts --env staging` — expect exit code 0, no errors
   b. Run it again — expect idempotent (no duplicate records, exit code 0)
   c. Open Supabase Dashboard → verify organization "Domaine Toubkal" exists with 3 farms, 15-20 parcels
   d. Open app → login as `demo@agrogina.ma` → verify dashboard shows 3 farms
   e. Navigate: Ferme Atlas → any olive parcel → Satellite tab → verify NDVI map renders with colored time series
   f. Navigate: same parcel → Calibration tab → verify all 8 steps have output (Step1 through Step8 non-null)
   g. Navigate: same parcel → Recommendations tab → verify 3-5 French-language Level 1 recommendations visible
   h. Navigate: Ferme Rif → any cereal parcel → verify crop type "blé dur" displays correctly
   i. Open Supabase → verify `harvest_records` table has entries for demo parcels spanning 2-3 years
   j. Run `npx ts-node scripts/seed-siam-demo.ts --env production` — expect same results
3. **Expected result**: All steps pass without errors. Demo org has 3 farms, 15-20 parcels, calibration data for 5+ parcels, French recommendations, and harvest records spanning multiple years. Seeder is idempotent across staging and production.

---

### 1.2 Demo Mode (Offline Fallback)

**Goal**: App works fully offline for demo purposes, no API calls needed.

**Approach**: Add a "Demo Mode" toggle that:
1. Bypasses auth — auto-logs in as demo user
2. Intercepts TanStack Query calls — returns pre-fetched JSON from `/public/demo-data/`
3. Skips real API calls entirely
4. Shows a "DEMO" badge in the UI so it's clear this isn't production

**Implementation options** (pick fastest):

**Option A: Static JSON files (recommended — fastest)**
- Generate a snapshot of all API responses for the demo org
- Save as JSON files in `project/public/demo-data/`
- Create a `useDemoMode()` hook that provides mock query functions
- When demo mode is active, queries return static data instead of fetching

**Option B: Service Worker cache**
- Visit the app online once → service worker caches all responses
- Works offline thereafter
- More complex, less reliable (cache can be evicted)

**Option C: localStorage snapshot**
- After loading demo org online, dump all TanStack Query cache to localStorage
- Restore on next visit (even offline)
- Fragile but quick

**Recommendation**: Option A. Most reliable, works even after browser cache clear.

**Files to create/modify**:
- `project/src/hooks/useDemoMode.ts` — demo mode state
- `project/src/lib/demo-data.ts` — static data provider
- `project/public/demo-data/*.json` — pre-fetched API responses
- `project/src/routes/_authenticated/` — add demo mode bypass in route context
- Auth bypass: modify auth guard to accept demo mode

**Acceptance criteria**:
- [ ] Toggle demo mode → app loads without internet
- [ ] All key pages work: dashboard, parcels, satellite, calibration, recommendations
- [ ] "DEMO" badge visible when active
- [ ] No network requests made in demo mode (verify in DevTools Network tab)
- [ ] Works on both desktop and tablet

**QA Scenario**:
1. **Tool**: Chrome DevTools (Network tab + Application tab)
2. **Steps**:
   a. Open app online → enable demo mode via toggle (or URL param `?demo=true`)
   b. Verify "DEMO" badge is visible in the top-right corner of the UI
   c. Open Chrome DevTools → Network tab → check "Offline" throttling
   d. Reload the page (Ctrl+Shift+R) → verify page loads successfully (not a browser error page)
   e. Navigate to Dashboard → verify 3 farms ("Ferme Atlas", "Ferme Ziz", "Ferme Rif") are visible
   f. Navigate to any parcel → Satellite tab → verify NDVI time series chart renders with data points
   g. Navigate to same parcel → Calibration tab → verify health score and all step outputs display
   h. Navigate to Recommendations → verify French recommendations appear
   i. Check Network tab → verify 0 failed requests, 0 pending requests (all data from local JSON)
   j. Disable offline mode → disable demo mode → verify app returns to normal auth flow
3. **Expected result**: App loads and fully navigates offline in demo mode with 0 network requests. All 5 key pages (dashboard, parcels, satellite, calibration, recommendations) render with data. "DEMO" badge persists on all pages. Disabling demo mode restores normal auth.

---

### 1.3 Screen Recording / Looping Video

**Goal**: 2-minute looping video that plays when the team is busy with another visitor.

**Content** (CEO to record):
1. 0:00-0:10 — AgroGina logo + tagline (FR): "Le premier ERP agricole intelligent du Maroc"
2. 0:10-0:30 — Satellite view of Moroccan farm parcels
3. 0:30-1:00 — Calibration pipeline walkthrough (NDVI → health score → recommendations)
4. 1:00-1:30 — AgromindIA in action (Level 1 recommendations in Darija/French)
5. 1:30-2:00 — Mobile app for field workers (tasks, harvest recording)
6. 2:00-2:10 — Contact info + QR code

**Format**: MP4, 1080p, silent (no audio — salon is loud), on-screen text annotations in French

**This is a CEO task** — use screen recording tool (OBS, Loom, or QuickTime). Dev can help with screen recording the app flow if needed.

**Dev task**: Create a simple HTML page that loops the video fullscreen — can be opened on the second screen.

**Files to create**:
- `scripts/siam-video-player.html` — fullscreen looping video player

---

## Phase 2: Lead Capture System (P0 — Days 1-4)

### Decision: HubSpot Free vs Custom

**Recommendation: HubSpot Free**

| Factor | HubSpot Free | Custom (Supabase) |
|--------|-------------|-------------------|
| Setup time | 2-3 hours | 2-3 days |
| Email sequences | ✅ Built-in | ❌ Need SendGrid + custom code |
| Pipeline view | ✅ Kanban board | ❌ Need to build UI |
| Mobile capture | ✅ App + camera scan | ❌ Need to build mobile page |
| Cost | Free (up to 1M contacts) | Free (your infra) |
| QR code forms | ✅ Native | ❌ Need to build |
| Post-SIAM | Ready to go | Still building follow-up flows |

**9 days before SIAM — you cannot afford 2-3 days building a CRM.**

### 2.1 HubSpot Setup

**CEO task** (dev can assist):

1. **Create account** at hubspot.com (free tier)
2. **Custom contact properties**:
   - `lead_type`: dropdown [Agriculteur, Partenaire/Distributeur, Investisseur, Presse, Institution]
   - `farm_name`: text
   - `farm_size_ha`: number
   - `current_tools`: text (what they currently use)
   - `crops`: multi-select [Olivier, Agrumes, Céréales, Maraîchage, Légumineuses, Rosacées, Palmier]
   - `region`: dropdown [Meknès, Fès, Marrakech, Souss, Haouz, Oriental, Tadla, Doukkala, Other]
   - `siam_interest`: multi-select [ERP, Satellite, AgromindIA, Mobile, Calibration, Accounting]
   - `demo_requested`: checkbox
   - `follow_up_notes`: text area

3. **Create 3 pipelines** (Sales → Deal Pipelines):
   - **Agriculteurs**: Intérêt → Demo → Essai Gratuit → Client
   - **Partenaires**: Contact → Réunion → Proposition → Signé
   - **Investisseurs**: Contact → Pitch → Due Diligence → Term Sheet

4. **Create lead capture form**:
   - Fields: Nom, Téléphone (WhatsApp), Email, Je suis (dropdown), Nom de ferme/coopérative, Superficie (ha), Cultures principales, Ce qui m'intéresse (multi-select)
   - Embed as standalone page
   - Set to create contact + auto-set lifecycle stage

5. **Generate QR code** from the form URL — use a free QR generator, print A3

6. **Install HubSpot mobile app** on all team phones

7. **Create team notification**: New form submission → notify via email + HubSpot mobile push

### 2.2 WhatsApp Lead Notification (Optional Quick Win)

If we want instant WhatsApp notification when a lead is captured:

- Use HubSpot webhook → Zapier (free tier) → WhatsApp Business API
- Or simpler: HubSpot free form sends email notification to the team's shared email

**Not critical — HubSpot mobile push notification is sufficient.**

---

## Phase 3: Landing Page (P1 — Days 3-5)

### 3.1 SIAM Landing Page

**Goal**: Mobile-optimized page for lead capture — QR code points here.

**Route**: Either `/siam` route in the existing app, or a standalone page.

**Recommendation**: Standalone page (subdomain or separate route) — doesn't require auth, loads fast, works on any phone.

**Content (FR)**:

```
┌─────────────────────────────────────────────┐
│                                             │
│  🛰️ AgroGina                                │
│  L'intelligence agricole vue de l'espace    │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  ✅ Surveillance satellite de vos parcelles │
│  ✅ Recommandations IA pour chaque culture  │
│  ✅ Gestion complète de votre exploitation  │
│  ✅ Application mobile pour le terrain      │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [Essayez gratuitement ▶]                   │
│                                             │
│  Nom: ___________                           │
│  Téléphone (WhatsApp): ___________          │
│  Email: ___________                         │
│  Superficie (ha): ___________               │
│  Cultures: [Olivier ▼] [Agrumes ▼] ...     │
│                                             │
│  [▶ Commencer]                              │
│                                             │
│  ─────────────────────────────────────────  │
│  📍 Stand XX - SIAM Meknès 2026            │
│  📞 +212 6XX XXX XXX                       │
│  🌐 agrogina.ma                            │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementation options**:

**Option A: Simple React page in existing project** (fastest)
- Add `/siam` public route (no auth required)
- Form submits to HubSpot form API (no backend needed)
- i18n: FR only (SIAM audience is Moroccan francophone)
- Deploy as part of the existing app

**Option B: Separate static HTML page**
- Pure HTML/CSS, hosted on Vercel/Netlify
- Even simpler but separate from the app
- Good as a fallback if app is down

**Recommendation**: Option A — keeps everything in one codebase.

**Files to create/modify**:
- `project/src/routes/siam.tsx` — public route (no auth guard)
- `project/src/components/siam/SiamLanding.tsx` — landing page component
- Add `siam` to i18n locales (or hardcode FR since it's a single-use page)

**Arabic version**: Consider an AR toggle — many Moroccan farmers are more comfortable in Arabic/Darija. But this is P2 — FR is sufficient for SIAM.

**Acceptance criteria**:
- [ ] Loads on mobile in < 3 seconds
- [ ] Form submits to HubSpot (or Supabase if not using HubSpot)
- [ ] Confirmation message after submission
- [ ] No auth required
- [ ] Works on all phone browsers
- [ ] QR code scans correctly to this page

**QA Scenario**:
1. **Tool**: Chrome DevTools (mobile emulation) + HubSpot contact search (or Supabase query)
2. **Steps**:
   a. Open `/siam` in Chrome DevTools mobile emulation (iPhone 14 / Samsung Galaxy S22)
   b. Verify page loads in < 3 seconds (check Network tab → DOMContentLoaded)
   c. Verify no redirect to login/auth page — page is publicly accessible
   d. Fill form: Nom = "Test SIAM", Téléphone = "+212 600000000", Email = "test-siam@agrogina.ma", Superficie = "50", Cultures = "Olivier"
   e. Click "Commencer" → verify confirmation message appears ("Merci ! Nous vous contacterons bientôt.")
   f. Open HubSpot → Contacts → search "test-siam@agrogina.ma" → verify contact exists with all fields populated correctly
   g. Scan QR code with a real phone → verify it opens the `/siam` page correctly
   h. Test on a real Android phone (Chrome) and real iPhone (Safari) — verify form renders and submits on both
   i. Test with empty required fields → verify validation errors appear (no silent failures)
3. **Expected result**: Page loads publicly in < 3s on mobile. Form submission creates a contact in HubSpot (or row in Supabase `leads` table) with all fields. Confirmation message displays. QR code resolves correctly. Works on both iOS Safari and Android Chrome.

---

## Phase 4: Materials Content (P1 — Days 3-6)

### 4.1 One-Pager (A4, French)

**CEO to write content, dev can format as PDF.**

**Structure**:

```
Recto:
┌─────────────────────────────────────────────┐
│ AGROGINA                                     │
│ Le premier ERP agricole intelligent du Maroc │
│                                              │
│ ┌─────────────────────────────────────────┐  │
│ │ POURQUOI AGROGINA ?                     │  │
│ │                                         │  │
│ │ 🛰️ Vue satellite — Surveillance de     │  │
│ │    vos parcelles Sentinel-2 en temps    │  │
│ │    réel (NDVI, santé, stress hydrique)  │  │
│ │                                         │  │
│ │ 🤖 AgromindIA — Recommandations IA     │  │
│ │    personnalisées pour chaque parcelle  │  │
│ │    "Arrose la parcelle B3 demain 8h"   │  │
│ │                                         │  │
│ │ 📱 Application terrain — Tâches,       │  │
│ │    récolte, pointage mobile hors-ligne  │  │
│ │                                         │  │
│ │ 📊 Gestion complète — Stocks,          │  │
│ │    comptabilité, main-d'œuvre, coûts   │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ POUR QUI ?                                   │
│ Exploitations 50-600+ ha | Oliviers,         │
│ agrumes, céréales, maraîchage                │
│                                              │
│ RÉSULTATS                                    │
│ • -30% pertes de récolte grâce à la          │
│   détection précoce de stress                │
│ • -20% consommation d'eau par la             │
│   calibration d'irrigation                   │
│ • 360° visibilité sur votre exploitation     │
│                                              │
│ ┌─────────────────────────────────────────┐  │
│ │ ESSAI GRATUIT                           │  │
│ │ ▶ agrogina.ma  |  📞 +212 6XX XXX XXX  │  │
│ │ 📍 Stand XX - SIAM Meknès 2026         │  │
│ └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Dev task**: Create as HTML → PDF using the existing PDF generation in backend-service (or use a simple tool).

### 4.2 Partner Deck (10 slides, FR/EN)

**CEO content, dev can create a clean HTML/PDF template.**

1. **Cover**: AgroGina logo + "Devenez partenaire"
2. **Market opportunity**: Moroccan agriculture (1.5M farms, 9M ha, growing digitization)
3. **What is AgroGina**: ERP + Agronomie + IA in one platform
4. **AgromindIA**: The differentiator — no other tool does this
5. **Product demo**: Key screenshots (satellite, calibration, recommendations)
6. **Target market**: 50-600ha farms, cooperatives, agricultural advisors
7. **Business model**: SaaS subscription per module + per ha
8. **Partner opportunity**: Revenue share, territory, support
9. **Traction**: Current users, parcels managed, early results
10. **Next steps**: Contact + QR code

### 4.3 Investor Deck (15-20 slides, FR/EN)

**CEO content entirely.** Standard pitch deck structure. Dev not needed.

### 4.4 Demo Script (Memorize)

**30-second hook** (for walk-ups):
> "AgroGina est le premier ERP agricole intelligent construit pour les fermes marocaines. On voit vos parcelles depuis l'espace et on vous dit exactement quoi faire."

**2-minute demo flow**:
1. Dashboard → show farm overview (3 farms, 15 parcels)
2. Pick an olive parcel → show satellite NDVI map
3. Calibration → show health score + anomalies detected
4. AgromindIA → show Level 1 recommendation in French
5. Mobile → show task assignment + worker clock-in

**Close**:
> "Vous voulez qu'on mappe votre ferme ? C'est gratuit. Donnez-moi votre numéro et on s'en occupe."

---

## Phase 5: Follow-Up Automation (P2 — Days 5-7)

### 5.1 Email Templates

**Pre-write in HubSpot (FR)**:

**Template 1: Agriculteur — Jour 1**
```
Objet: Votre ferme vue de l'espace 🛰️

Bonjour [Prénom],

Merci pour votre visite au stand AgroGina au SIAM !

Comme promis, voici votre accès gratuit pour découvrir la plateforme :
👉 agrogina.ma/signup

Votre parcelle est probablement déjà visible sur nos cartes satellites. 
Connectez-vous pour vérifier !

À très vite,
L'équipe AgroGina
```

**Template 2: Partenaire — Jour 1**
```
Objet: Partenariat AgroGina — Suite à notre rencontre

Bonjour [Prénom],

Ravi de vous avoir rencontré au SIAM.

Comme convenu, voici notre dossier partenaire en pièce jointe.
Nous sommes convaincus qu'ensemble nous pouvons accélérer la 
transformation digitale de l'agriculture marocaine.

Quand seriez-vous disponible pour un appel de 30 minutes cette semaine ?

Cordialement,
L'équipe AgroGina
```

**Template 3: Investisseur — Jour 1**
```
Objet: AgroGina — L'IA au service de l'agriculture marocaine

Bonjour [Prénom],

Merci pour votre intérêt lors du SIAM.

AgroGina est le premier ERP agricole IA-native pour le marché MENA.
Vous trouverez notre pitch deck en pièce jointe.

Nous serions ravis de vous présenter le produit en détail 
lors d'une démonstration privée.

Cordialement,
L'équipe AgroGina
```

### 5.2 Follow-Up Sequence (HubSpot)

| Day | Agriculteur | Partenaire | Investisseur |
|-----|------------|------------|-------------|
| 0 | Welcome email + signup link | Partner deck PDF | Pitch deck PDF |
| 2 | "Your farm is mapped!" screenshot | "When can we talk?" | "Demo availability?" |
| 5 | Feature highlight (satellite) | Call/meeting invite | Traction update |
| 10 | WhatsApp message | Proposal draft | Meeting invite |
| 14 | Phone call | Follow-up call | Follow-up call |

---

## Phase 6: Booth Operations (P2 — Days 5-9)

### 6.1 Hardware Checklist

- [ ] 2 screens (1 for live demo, 1 for looping video)
- [ ] 1 tablet/iPad (lead capture — HubSpot form)
- [ ] Laptop for demo
- [ ] 4G/5G hotspot (backup internet — INWI or Orange MiFi)
- [ ] HDMI cables, power strips, extension cords
- [ ] Phone chargers for team

### 6.2 Print Materials

- [ ] QR code — A3 poster (links to landing page / HubSpot form)
- [ ] One-pager — 200 copies (A4, color, FR)
- [ ] Business cards — all team members
- [ ] Branded polo shirts / t-shirts — 2-4x
- [ ] Pull-up banner (if not provided by SIAM)

### 6.3 Team Roles

| Role | Person | Responsibilities |
|------|--------|-----------------|
| **Demo lead** | TBD | Run live demos on main screen |
| **Greeter/Scanner** | TBD | Welcome visitors, scan badges, capture leads |
| **Closer** | TBD | Handle partner/investor conversations, schedule follow-ups |
| **Floater** | TBD | Rotate breaks, handle overflow, post social media |

### 6.4 Daily SIAM Routine

**Morning (before doors open)**:
- Check demo app works (online + offline)
- Verify hotspot works
- HubSpot app logged in on all phones
- Print materials stocked

**Every 2 hours**:
- Quick team sync: how many leads so far? Any hot ones?
- Post 1 photo/video on LinkedIn/Instagram

**Evening (after doors close)**:
- Review all leads captured today
- Send Day-0 emails to ALL leads (HubSpot sequence)
- Flag hot leads for next-day follow-up
- Charge all devices

---

## Implementation Tasks (Dev)

### Week 1 (Days 1-5): Build Everything

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| **Day 1** | Demo data seeder script | `scripts/seed-siam-demo.ts` + data files |
| **Day 2** | Demo mode (offline) + test seeder | `useDemoMode` hook + static JSON data |
| **Day 3** | Landing page + QR code | `/siam` route + HubSpot form integration |
| **Day 4** | Video player page + polish demo mode | `siam-video-player.html` + bug fixes |
| **Day 5** | Integration test: full offline demo walk-through | Everything works without internet |

### Week 2 (Days 6-9): Test + Print

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| **Day 6** | One-pager content finalized → print | PDF sent to printer |
| **Day 7** | Partner deck finalized → print | PDF sent to printer |
| **Day 8** | Full booth rehearsal: demo script, lead capture, fallbacks | Team confident |
| **Day 9** | Pack everything, charge devices, load offline demo | Ready to go |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| No internet at SIAM | Offline demo mode (static JSON) + 4G hotspot |
| Demo crashes on a parcel | Pre-recorded video fallback on second screen |
| Too many visitors, can't capture all leads | QR code on poster → self-service form |
| Lead data lost | HubSpot auto-saves, no local-only data |
| App goes down during live demo | Switch to offline mode seamlessly |
| Team overwhelmed | Video loop plays autonomously, QR code handles self-service |

---

## Success Metrics

| Metric | Target | How to Track |
|--------|--------|-------------|
| Total leads captured | 150+ | HubSpot contacts |
| Qualified leads (farmers 50+ ha) | 30+ | HubSpot custom property filter |
| Partner meetings scheduled | 5+ | Partner pipeline stage |
| Investor pitches given | 3+ | Investor pipeline stage |
| Demo sessions run | 50+ | Team tally (manual) |
| Post-SIAM trial signups | 20+ within 2 weeks | App analytics |
| Social media impressions | 10K+ | LinkedIn/Instagram insights |
