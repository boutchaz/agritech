# Barcode System — Full ERPNext Parity Implementation Plan

## Context

AgroGina currently has basic barcode support:
- Single `barcode` column on `items` and `product_variants` tables
- `GET /api/v1/items/by-barcode/:barcode` endpoint (checks variants first, then items)
- `useBarcodeLookup` hook (simple query wrapper)
- `QuickStockEntry` component (manual barcode input → stock entry)
- `html5-qrcode` package installed (unused)

**Goal:** Match ERPNext's barcode system — multi-barcode per item, universal scan API, reusable scanner engine, transaction form integration.

---

## Phase 1: Database Foundation

### 1.1 Create `item_barcodes` table

```sql
CREATE TABLE IF NOT EXISTS item_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  barcode_type TEXT CHECK (barcode_type IN (
    'EAN', 'EAN-8', 'EAN-13', 'UPC', 'UPC-A', 'CODE-39', 'CODE-128',
    'GS1', 'GTIN', 'GTIN-14', 'ISBN', 'ISBN-10', 'ISBN-13',
    'ISSN', 'JAN', 'PZN', 'QR', ''
  )),
  unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Unique barcode per organization (across all items)
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_barcodes_unique 
  ON item_barcodes(organization_id, barcode) 
  WHERE deleted_at IS NULL AND barcode IS NOT NULL;

-- Fast lookup by barcode
CREATE INDEX IF NOT EXISTS idx_item_barcodes_barcode 
  ON item_barcodes(barcode) 
  WHERE deleted_at IS NULL;

-- Fast lookup by item
CREATE INDEX IF NOT EXISTS idx_item_barcodes_item 
  ON item_barcodes(item_id) 
  WHERE deleted_at IS NULL;
```

**Key decisions:**
- `barcode_type` validation via CHECK constraint (not application-level only)
- `unit_id` per barcode — same item can have different barcodes for different UOMs (e.g., 1kg bottle vs 5L bottle)
- `is_primary` flag — controls which barcode shows in lists/defaults
- `is_active` — soft disable without deleting
- Unique constraint on `(organization_id, barcode)` — prevents duplicate barcodes across items within same org

### 1.2 Migrate existing barcodes

```sql
-- Migrate items.barcode → item_barcodes (set as primary)
INSERT INTO item_barcodes (organization_id, item_id, barcode, is_primary, created_at)
SELECT organization_id, id, barcode, true, created_at
FROM items 
WHERE barcode IS NOT NULL AND barcode != '' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Migrate product_variants.barcode → item_barcodes
INSERT INTO item_barcodes (organization_id, item_id, barcode, unit_id, is_primary, created_at)
SELECT pv.organization_id, pv.item_id, pv.barcode, pv.unit_id, false, pv.created_at
FROM product_variants pv
WHERE pv.barcode IS NOT NULL AND pv.barcode != '' AND pv.deleted_at IS NULL
ON CONFLICT DO NOTHING;
```

### 1.3 Add barcode to stock entry items

```sql
ALTER TABLE stock_entry_items 
  ADD COLUMN IF NOT EXISTS scanned_barcode TEXT;
```

This persists which barcode was used to add the item — useful for traceability.

### 1.4 RLS policies

```sql
ALTER TABLE item_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON item_barcodes
  FOR ALL USING (is_organization_member(organization_id));
```

### 1.5 Do NOT drop existing barcode columns

Keep `items.barcode` and `product_variants.barcode` as denormalized `is_primary` cache for fast lookups. They'll be synced via triggers.

### Files changed:
- `project/supabase/migrations/00000000000000_schema.sql` — add table + indexes + RLS

---

## Phase 2: Backend — Universal Scan API

### 2.1 New `BarcodeModule` (NestJS)

```
agritech-api/src/modules/barcode/
├── barcode.module.ts
├── barcode.controller.ts
├── barcode.service.ts
├── dto/
│   ├── create-barcode.dto.ts
│   ├── update-barcode.dto.ts
│   └── scan-barcode.dto.ts
└── barcode.service.spec.ts
```

### 2.2 `BarcodeController` — Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/barcodes` | Create barcode for item |
| `GET` | `/api/v1/barcodes/item/:itemId` | List barcodes for item |
| `PATCH` | `/api/v1/barcodes/:id` | Update barcode |
| `DELETE` | `/api/v1/barcodes/:id` | Soft-delete barcode |
| `GET` | `/api/v1/barcodes/scan/:value` | **Universal scan endpoint** (ERPNext parity) |
| `POST` | `/api/v1/barcodes/validate` | Validate barcode checksum |

### 2.3 Universal `scanBarcode()` — the core API

```typescript
// barcode.service.ts
async scanBarcode(searchValue: string, organizationId: string, ctx?: ScanContext): Promise<ScanResult> {
  // 1. Check cache (60s TTL via Supabase or in-memory)
  // 2. Search item_barcodes → { item_id, barcode, barcode_type, unit_id }
  // 3. Search items.barcode (fallback for migrated data) → { item_id }
  // 4. Search product_variants.barcode (fallback) → { item_id, variant_id }
  // 5. Search batches by batch_number → { item_id, batch_id }
  // 6. Search warehouses by name/code → { warehouse_id }
  // 7. Return {} if nothing found
}

interface ScanResult {
  item_id?: string;
  item_code?: string;
  item_name?: string;
  variant_id?: string;
  barcode?: string;
  barcode_type?: string;
  unit_id?: string;
  unit_name?: string;
  batch_no?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
}
```

**Difference from ERPNext:** We use in-memory cache (Map with TTL) instead of Redis since we don't have Redis. Supabase's built-in caching handles query caching.

### 2.4 Barcode Validation

Use `jsbarcode` or `barcode-validator` npm package to validate checksums:

```typescript
// On create/update, if barcode_type is set:
// - EAN-13: validate Luhn checksum
// - EAN-8: validate checksum
// - UPC-A: validate checksum
// - CODE-39: validate characters
// - QR: skip validation (no checksum)
```

### 2.5 Sync triggers

```sql
-- Auto-sync primary barcode to items.barcode (denormalized cache)
CREATE OR REPLACE FUNCTION sync_primary_barcode_to_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary AND NEW.is_active AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE items SET barcode = NEW.barcode, updated_at = NOW()
    WHERE id = NEW.item_id AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_primary_barcode
  AFTER INSERT OR UPDATE ON item_barcodes
  FOR EACH ROW EXECUTE FUNCTION sync_primary_barcode_to_item();
```

### 2.6 Keep existing `/items/by-barcode/:barcode` working

Update `ItemsService.findByBarcode()` to also check `item_barcodes` table. This avoids breaking the existing `useBarcodeLookup` hook.

### Files changed:
- `agritech-api/src/modules/barcode/` — new module (all files)
- `agritech-api/src/modules/items/items.service.ts` — update `findByBarcode` to check `item_barcodes`
- `agritech-api/src/app.module.ts` — register `BarcodeModule`

---

## Phase 3: Frontend — Reusable Scanner Engine

### 3.1 `useBarcodeScanner` hook

```typescript
// project/src/hooks/useBarcodeScanner.ts

interface UseBarcodeScannerOptions {
  organizationId: string;
  items: StockEntryItemForm[];        // Current items in form
  onItemFound: (result: ScanResult) => void;  // Callback when item found
  onNotFound: (barcode: string) => void;      // Callback when nothing found
  warehouseId?: string;               // Default warehouse for scan
  maxQtyPerItem?: number;             // For pick lists
  autoIncrement?: boolean;            // Default: true (qty +1 on repeat scan)
  playSound?: boolean;                // Default: false
}
```

**Core behavior (mirrors ERPNext's BarcodeScanner class):**

1. User scans/types barcode into scan field
2. Hook calls `GET /api/v1/barcodes/scan/:value`
3. If item found:
   - Check if item already in list (same item_id + batch + unit)
   - If yes → increment qty by 1
   - If no → call `onItemFound` to add new row
   - Show toast: "Row #3: Qty +1" or "Row #4: Item added"
4. If warehouse found:
   - Set warehouse context for subsequent scans
   - Show toast: "Warehouse X set for next scans"
5. If nothing found:
   - Call `onNotFound`
   - Show toast: "No item found"
   - Clear scan field

### 3.2 `BarcodeScanField` component

```typescript
// project/src/components/Stock/BarcodeScanField.tsx
// Reusable barcode input field with:
// - Auto-focus on mount
// - Auto-clear after scan (triggers on Enter or short delay)
// - Visual feedback (green flash on success, red on fail)
// - Optional camera button (opens html5-qrcode scanner)
// - Loading state while scanning
```

### 3.3 `useBarcodeCameraScanner` hook (Mobile)

```typescript
// project/src/hooks/useBarcodeCameraScanner.ts
// Wraps html5-qrcode for camera-based scanning
// Returns: { startScanner, stopScanner, isScanning, videoRef }
// Used in mobile PWA for field workers
```

### 3.4 API client

```typescript
// project/src/lib/api/barcodes.ts
export const barcodesApi = {
  getAll: (itemId: string, orgId: string) => Promise<ItemBarcode[]>,
  create: (data: CreateBarcodeInput, orgId: string) => Promise<ItemBarcode>,
  update: (id: string, data: UpdateBarcodeInput, orgId: string) => Promise<ItemBarcode>,
  delete: (id: string, orgId: string) => Promise<void>,
  scan: (value: string, orgId: string) => Promise<ScanResult>,
  validate: (barcode: string, type?: string) => Promise<ValidationResult>,
};
```

### 3.5 Types

```typescript
// project/src/types/barcode.ts
export interface ItemBarcode {
  id: string;
  organization_id: string;
  item_id: string;
  barcode: string;
  barcode_type: BarcodeType | '';
  unit_id?: string;
  unit_name?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export type BarcodeType =
  | 'EAN' | 'EAN-8' | 'EAN-13' | 'UPC' | 'UPC-A'
  | 'CODE-39' | 'CODE-128' | 'GS1' | 'GTIN' | 'GTIN-14'
  | 'ISBN' | 'ISBN-10' | 'ISBN-13' | 'ISSN' | 'JAN' | 'PZN'
  | 'QR' | '';

export interface ScanResult {
  item_id: string;
  item_code: string;
  item_name: string;
  variant_id?: string;
  barcode: string;
  barcode_type?: string;
  unit_id?: string;
  unit_name?: string;
  batch_no?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
}
```

### 3.6 Translations

Add barcode keys to all 3 locales:
- `stock.barcode.scan` / `Code-barres` / `مسح الباركود`
- `stock.barcode.itemAdded` / `Article ajouté` / `تمت إضافة المادة`
- `stock.barcode.qtyIncreased` / `Quantité +1` / `الكمية +1`
- `stock.barcode.notFound` / `Aucun article trouvé` / `لم يتم العثور على مادة`
- `stock.barcode.warehouseSet` / `Entrepôt défini` / `تم تحديد المستودع`
- etc.

### Files created:
- `project/src/hooks/useBarcodeScanner.ts`
- `project/src/hooks/useBarcodeCameraScanner.ts`
- `project/src/components/Stock/BarcodeScanField.tsx`
- `project/src/lib/api/barcodes.ts`
- `project/src/types/barcode.ts`

### Files modified:
- `project/src/locales/en/stock.json` — barcode keys
- `project/src/locales/fr/stock.json` — barcode keys
- `project/src/locales/ar/stock.json` — barcode keys

---

## Phase 4: Transaction Form Integration

### 4.1 StockEntryForm — Add scan field

**Location:** `project/src/components/Stock/StockEntryForm.tsx` (793 lines)

**Changes:**
- Add `<BarcodeScanField>` above the items table
- Wire `useBarcodeScanner` hook with:
  - `items` from `useFieldArray`
  - `onItemFound` → append new row or increment existing
  - `warehouseId` from form (to_warehouse_id for receipt, from_warehouse_id for issue)
- Store `scanned_barcode` on each item row for traceability
- Show barcode badge next to scanned items in the items table

### 4.2 QuickStockEntry — Upgrade

**Location:** `project/src/components/Stock/QuickStockEntry.tsx` (205 lines)

**Changes:**
- Replace manual barcode input with `<BarcodeScanField>`
- Auto-populate warehouse + quantity when item found
- Support multi-scan (scan multiple items → list → submit all)
- Keep existing submit flow

### 4.3 StockTakeWizard — Add scan support

**Location:** `project/src/components/Stock/StockTakeWizard.tsx` (441 lines)

**Changes:**
- Add `<BarcodeScanField>` in Step 2 (counting phase)
- When barcode scanned → auto-fill item + increment physical quantity
- This is where warehouse-first scanning shines: scan warehouse → then scan items

### 4.4 ItemManagement — Barcode management UI

**Location:** `project/src/components/Stock/ItemManagement.tsx`

**Changes:**
- Add "Barcodes" section/tab to item detail view
- List all barcodes for the item with type, UOM, primary flag
- Add/edit/delete barcode dialog
- Barcode type dropdown with validation
- "Generate Barcode" button (generates EAN-13 or CODE-128 using jsbarcode)
- Print barcode labels button

### 4.5 StockEntryItem — Persist scanned barcode

Update `CreateStockEntryItemInput` type to include `scanned_barcode?: string`.

### Files modified:
- `project/src/components/Stock/StockEntryForm.tsx` — add scan field
- `project/src/components/Stock/QuickStockEntry.tsx` — upgrade scanner
- `project/src/components/Stock/StockTakeWizard.tsx` — add scan support
- `project/src/components/Stock/ItemManagement.tsx` — barcode management
- `project/src/types/stock-entries.ts` — add scanned_barcode field

---

## Effort Estimate

| Phase | Files Changed/Created | Effort |
|-------|----------------------|--------|
| Phase 1: DB | 1 (schema.sql) | Small |
| Phase 2: Backend | ~8 files (new module + update items) | Medium |
| Phase 3: Frontend Engine | ~7 files (new hooks + components + API + types) | Medium |
| Phase 4: Integration | ~5 files (modify existing forms) | Medium |
| **Total** | **~21 files** | **Medium-Large** |

---

## Implementation Order

1. **Phase 1** (DB) → run migration, generate types
2. **Phase 2** (Backend) → build BarcodeModule, update findByBarcode
3. **Phase 3** (Frontend Engine) → build hooks, components, API client, types
4. **Phase 4** (Integration) → wire scanner into existing forms

Each phase is independently testable and deployable.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Barcode unique constraint breaks on migration (duplicate barcodes) | Migration script handles conflicts with `ON CONFLICT DO NOTHING` and logs duplicates |
| Camera scanner fails on old Android devices | Graceful fallback to manual input; camera is optional enhancement |
| Performance on large barcode tables | Index on `barcode` column; unique constraint doubles as index |
| Offline scanning doesn't work (API call required) | Phase 3: `useBarcodeScanner` works with TanStack Query cache. Phase 5 (future): local barcode index for full offline |
| Breaking existing `useBarcodeLookup` | Keep it working by updating backend `findByBarcode` to check new table |

---

## Out of Scope (Future Phases)

- Serial No resolution via barcode scan (requires serial tracking system)
- Batch No resolution via barcode scan (requires batch management enhancement)
- Warehouse-first scanning UX (scan warehouse → context for items)
- Print format barcode rendering (PDF generation)
- Audio feedback (success/fail sounds)
- Barcode label printing
- Full offline barcode index (local DB / IndexedDB)
