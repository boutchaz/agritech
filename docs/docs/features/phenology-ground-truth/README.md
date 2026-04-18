# Phenology ground truth — field observations

This document describes the **Ground Truth Collection** feature for AgroGina: in-field phenological observations that validate satellite- and literature-driven phenology, enable learning over time, and anchor a calibration feedback loop.

**Status:** Product specification — **requires CEO validation** before implementation (new feature + new database table per project decision escalation).

---

## Table of contents

1. [Problem statement](#problem-statement)
2. [What “ground truth” means here](#what-ground-truth-means-here)
3. [User stories](#user-stories)
4. [Core interaction model](#core-interaction-model)
5. [Stage picker design](#stage-picker-design)
6. [Data captured per observation](#data-captured-per-observation)
7. [Offline-first requirements](#offline-first-requirements)
8. [What the system does with observations](#what-the-system-does-with-observations)
9. [Display levels (CEO framework)](#display-levels-ceo-framework)
10. [Where it lives in the stack](#where-it-lives-in-the-stack)
11. [Database schema sketch](#database-schema-sketch)
12. [Success metrics](#success-metrics)
13. [Open questions for CEO](#open-questions-for-ceo)
14. [Implementation checklist (post-approval)](#implementation-checklist-post-approval)
15. [Related documentation](#related-documentation)

---

## Problem statement

AgroGina’s phenology detection combines **satellite indices** with **GDD thresholds** from the literature. Today there is:

- **No** systematic way to verify predictions against what is actually happening in the field.
- **No** durable path to improve models season over season.

The product can be **confidently wrong** with no learning signal.

**The gap:** An agronomist walks a parcel, sees olive trees in full bloom, and that observation — one of the strongest calibration signals available — **has nowhere to go** in the product.

---

## What “ground truth” means here

A **ground truth** record is an **in-field phenological observation**: a human confirms **which growth stage** a crop is **actually** in, at a **specific parcel**, on a **specific date**, optionally backed by a **photo**.

**Scope boundaries:**

- **One observation per parcel per visit** — not a long survey, not a 30-field form.
- Target flow: **three taps**: parcel → stage → done (photo optional).

---

## User stories

### Hassan (agronomist, manages ~15 farms)

Hassan visits Parcelle B3 and sees olives at **nouaison** (fruit set). He opens the app, selects the parcel, picks **“BBCH 69 — Nouaison”**, optionally photographs the fruit, and saves. The action should take **~10 seconds**. He repeats this for **4–5 parcels per visit**, across **several farms** in a day.

### Karim (farm manager, ~300 ha)

Workers report that flowering started on the west block. Karim logs it from the **office on web**: parcel + stage. He does **not** want BBCH jargon as the primary label — he needs **plain language** (e.g. “Floraison”, not “BBCH 61”).

### Ahmed (~50 ha, limited tech background, Darija speaker)

Ahmed sees trees green again after winter. He uses a **simple, visual flow**: a prominent action, **picture cards** for stages, **Arabic labels**, minimal terminology.

---

## Core interaction model

```text
[Select parcel] → [Pick stage] → [Optional: photo] → [Save]
```

**Principles:**

- Fast enough for **field use** (Hassan).
- **Plain-language** first, codes secondary (Karim).
- **Visual + localized** defaults for low-literacy / non-expert users (Ahmed).

---

## Stage picker design

The stage picker must satisfy **all three personas**:

| Requirement | Rationale |
|-------------|-----------|
| **Visual cards** with reference photos for major stages | Ahmed + quick field ID |
| **Plain-language labels** in the user’s language (fr / ar / en) | Karim + Ahmed |
| **BBCH code** shown small for experts | Hassan (Level 3) |
| **Grouped by macro phase** | Scanability in the field |

Suggested macro phase grouping (example framing; exact labels i18n):

`Dormance → Croissance → Floraison → Fructification → Récolte → Repos`

**Crop-specific stages:**

- Example: **olive** — ~6 macro stages mapping to **13 BBCH** substages (indicative; final mapping from referential).
- **Citrus** and other crops use **different** stage sets.

**Source of truth for stages:**

- Stages are **not** invented in the UI — they are pulled from the **referential JSON** (`stades_bbch` / crop-specific BBCH definitions already maintained per crop).

---

## Data captured per observation

| Field | Source | Required |
|-------|--------|----------|
| `parcel_id` | User selection | Yes |
| `bbch_code` | Stage picker | Yes |
| `observed_at` | Device timestamp | Yes (automatic) |
| `observer_id` | Authenticated user | Yes (automatic) |
| `confidence` | User: “Sure” / “Approximate” | Yes (default: sure) |
| `photo_url` | Camera / gallery → storage | No |
| `notes` | Free text | No |
| `device_location` | GPS when available | No (automatic if permitted) |
| `organization_id` | Auth / org context | Yes (automatic) |

**Multi-tenancy:** Every persisted row must be scoped by **`organization_id`**; all API and RLS rules must enforce org isolation (see project conventions).

---

## Offline-first requirements

Rural Morocco implies **intermittent 3G/4G**. This feature is **critical** for Hassan in the field.

| Requirement | Detail |
|-------------|--------|
| **Local queue** when offline | Observations persist locally immediately |
| **Background sync** when online | No blocking spinner after “saved locally” |
| **Photo handling** | Client-side compression before upload; upload retries in background |
| **Perceived completion** | “Saved locally = done” for the user; sync is silent / status-only |

This aligns with the product’s broader **offline-first** direction (TanStack Query cache, future PWA — see project conventions).

---

## What the system does with observations

### Phase 1 — Immediate product value

- Show observations on the **parcel timeline** alongside satellite-derived signals.
- On a **phenology dashboard**: **predicted vs observed** stage dates where applicable.
- Compute **prediction error** (example): `predicted_date − observed_date` per stage (definition to be finalized with data model).

### Phase 2 — Learning loop

- After **~2 seasons** of quality data: support **per-parcel GDD threshold adjustments**.
- **Bayesian-style update** framing: prior = literature threshold; evidence = observed transitions / timing.
- Persist adjusted thresholds in **calibration output**; mark as **field-calibrated** where rules allow.
- Raise **confidence** in automated phenology when field data **confirms** satellite-backed predictions.

### Phase 3 — Network effects (strategic)

- Aggregate observations across parcels with same **variety + region** (subject to privacy decisions).
- Build **regional phenology** insights (e.g. “Picholine in Meknes breaks dormancy at GDD X, not Y”).
- Long-term **data moat**: Moroccan field truth competitors do not hold at scale — **if** governance and consent allow aggregation.

---

## Display levels (CEO framework)

| Level | Persona skew | Experience |
|-------|----------------|------------|
| **Level 1** | Ahmed | Simple confirmation copy, e.g. “Vos oliviers sont en floraison ✓” — minimal science |
| **Level 2** | — | **Blocked** pending CEO definition — **do not implement** |
| **Level 3** | Hassan | Full timeline, predicted vs observed dates, GDD at observation, error in days, multi-season trends |

---

## Where it lives in the stack

| Layer | Location (proposed) | Rationale |
|-------|---------------------|-----------|
| **Mobile UI** | `mobile/app/.../parcel/[id]/observation.tsx` (path illustrative) | Primary capture device in the field |
| **Web UI** | `project/src/routes/.../parcels.$parcelId.observations.tsx` (path illustrative) | Office logging (Karim) |
| **API** | `agritech-api/src/modules/phenology-observations/` | NestJS owns business data and writes |
| **Storage** | New `phenology_observations` table + **Supabase Storage** for photos | RLS by `organization_id` |
| **Calibration pipeline** | `backend-service/` reads observations during **recalibration** | FastAPI **reads** business data for compute; **does not** own business writes |

This respects the **dual-backend** split: business tables and mutations stay in **NestJS + Postgres**; FastAPI consumes for GEE / calibration jobs.

---

## Database schema sketch

> **Note:** Illustrative SQL only. Final types, indexes, triggers, and RLS must follow `project/supabase/migrations/` conventions and CEO-approved schema policy.

```sql
CREATE TABLE phenology_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parcel_id UUID NOT NULL REFERENCES parcels(id),
  observer_id UUID NOT NULL REFERENCES profiles(id),
  bbch_code TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'sure',
  photo_url TEXT,
  notes TEXT,
  device_location GEOGRAPHY(POINT, 4326),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phenology_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON phenology_observations
  FOR ALL
  USING (is_organization_member(organization_id));
```

**Follow-up schema topics (post-approval):**

- Check constraints or enum for `confidence`.
- Indexes for `(organization_id, parcel_id, observed_at DESC)` and common dashboard queries.
- Optional linkage to `crop_id` / variety if not inferable from parcel alone.
- Photo object naming, bucket policies, and signed URL strategy.

---

## Success metrics

| Type | Metric | Target (initial) |
|------|--------|------------------|
| **Leading** | Observations per week per agronomist | **5+** |
| **Lagging** | Mean absolute prediction error for major stages after one season | e.g. from **±15 days → ±5 days** (tunable with CEO) |

---

## Open questions for CEO

1. **Privacy vs model quality:** Should observations stay **strictly private per organization**, or **opt-in** contribute to a **shared regional** model (cooperatives may prefer sharing; individual farms may not)?
2. **Crop priority:** **Olive** has the strongest BBCH state-machine story today; **citrus** may benefit most from ground truth because legacy curve-fitting is weakest — which crop ships first?
3. **Photo policy:** Should photos be **optional always**, or **required** for certain confidence levels / ML training tiers? Photos help future supervised learning but add **friction** and **storage cost**.

---

## Implementation checklist (post-approval)

Use this as a engineering runbook once the CEO signs off on scope, privacy, and schema.

- [ ] **Product:** Finalize Level 1 vs Level 3 surfaces; confirm Level 2 remains blocked.
- [ ] **Design:** Stage picker wireframes (visual cards, macro groups, i18n).
- [ ] **Data:** Add idempotent migration + RLS + indexes; regenerate TypeScript types (`db:generate-types`).
- [ ] **API:** NestJS module (DTOs, guards order: JWT → org → policies), pagination list, create/update as needed.
- [ ] **Storage:** Supabase bucket + upload path; secure URLs; org-scoped paths.
- [ ] **Web:** Route under authenticated parcel context; `react-hook-form` + zod; TanStack Query with `organizationId` in keys.
- [ ] **Mobile:** Local queue + sync worker; image compression; optimistic UI.
- [ ] **Pipeline:** Read-only integration in calibration / phenology jobs in `backend-service`.
- [ ] **i18n:** Keys in `en`, `fr`, `ar` namespaces (likely `common` + agronomy-specific namespace TBD).
- [ ] **Analytics:** Events for “observation saved”, “sync completed”, “sync failed” for leading metric.

---

## Related documentation

- [AI calibration feature](../ai-calibration.md)
- [Satellite analysis](../satellite-analysis.md)
- Referentials: [Olive tree](../../referentials/olive-tree.md), [Citrus](../../referentials/citrus.md)
- [Calibration engine spec](../../specs/calibration-engine-spec.md)
- Project conventions: repository root `CLAUDE.md` (multi-tenancy, offline-first, dual-backend)

---

## Reespec / formal brief

This README is suitable as the **single source of truth** for discovery and planning. If the team uses **reespec**, this content can seed:

- **Discover** — narrow CEO open questions and privacy model.
- **Plan** — API contracts, mobile sync protocol, and dashboard Phase 1 scope.
- **Execute** — vertical slice: API + web list/create + one mobile flow.

Ask product leadership whether to open a **reespec discovery** or **formal brief** ticket linking to this file.
