---
sidebar_position: 13
title: "Inventory & Stock Management"
---

# Inventory & Stock Management

The Inventory & Stock Management system handles warehouse management, inventory tracking, and a multi-step reception batch workflow that covers receiving goods, quality control, decision routing, and financial processing. It is built with NestJS and Supabase across two primary modules: `WarehousesModule` and `ReceptionBatchesModule`.

## Warehouse Management

Warehouses represent physical storage locations within an organization. The `WarehousesService` provides CRUD operations and inventory queries, all scoped by organization via the `x-organization-id` header.

### Warehouse Fields

| Field | Description |
|---|---|
| `name` | Warehouse name (required) |
| `description` | Free-text description |
| `location` | General location description |
| `address` / `city` / `postal_code` | Physical address fields |
| `capacity` | Storage capacity value |
| `capacity_unit` | Unit for capacity (e.g., tonnes, pallets) |
| `temperature_controlled` | Whether the warehouse has temperature control (default: `false`) |
| `humidity_controlled` | Whether the warehouse has humidity control (default: `false`) |
| `security_level` | Security classification (default: `standard`) |
| `manager_name` / `manager_phone` | Contact information for the warehouse manager |
| `farm_id` | Optional link to a farm entity |
| `is_active` | Soft-delete flag (default: `true`) |

### Soft Delete

Deleting a warehouse sets `is_active` to `false` rather than removing the record. The `findAll` query only returns active warehouses.

### Inventory Query

The `GET /warehouses/inventory` endpoint queries the `inventory_items` table, joining with `items` (for item code, name, default unit) and `warehouses` (for warehouse name). It supports optional filters:

- `warehouse_id` -- restrict to a specific warehouse
- `item_id` -- restrict to a specific item

Results are ordered by item name ascending.

## Reception Batches

Reception batches track the inbound flow of goods (typically harvested produce) through a structured 4-step workflow. The controller is mounted at `organizations/:organizationId/reception-batches` and protected by `JwtAuthGuard`.

### Batch Lifecycle

```
received --> quality_checked --> decision_made --> processed
                                                     |
                               (any non-processed) --> cancelled
```

Each batch transitions through these statuses. Cancelled and processed batches cannot be further modified.

### Step 1: Basic Reception (Create)

`POST /organizations/:orgId/reception-batches`

Creates a new reception batch with an auto-generated batch code in the format `RB-YYYYMMDD-NNNN` (zero-padded sequential number per organization). The initial status is `received` with decision `pending`.

**Required fields:**
- `warehouse_id` -- receiving warehouse
- `reception_date` -- date of reception
- `weight` -- batch weight (minimum 0)

**Optional fields:**
- `harvest_id` -- link to a harvest record
- `parcel_id` / `crop_id` -- production origin
- `culture_type` -- crop type description
- `reception_time` -- time of reception (HH:MM:SS)
- `weight_unit` -- unit for weight (default: kg)
- `quantity` / `quantity_unit` -- alternate quantity measurement
- `received_by` -- worker who received the batch
- `producer_name` / `supplier_id` -- supplier information
- `lot_code` -- traceability lot code
- `notes` -- free-text notes

### Step 2: Quality Control

`PATCH /organizations/:orgId/reception-batches/:id/quality-control`

Updates quality inspection results and transitions the batch to `quality_checked` status. Cannot be applied to cancelled or processed batches.

**Quality control fields:**

| Field | Description |
|---|---|
| `quality_grade` | Grade classification: `A`, `B`, `C`, `Extra`, `First`, `Second`, `Third` |
| `quality_score` | Numeric score from 1 to 10 |
| `quality_notes` | Inspector notes |
| `humidity_percentage` | Humidity measurement (0-100%) |
| `maturity_level` | `immature`, `optimal`, or `overripe` |
| `temperature` | Temperature in Celsius |
| `moisture_content` | Moisture content percentage (0-100%) |
| `defects` | Array of defect objects, each with `type`, `severity` (minor/moderate/severe), optional `description` and `percentage` |
| `photos` | Array of photo URLs |
| `quality_checked_by` | Worker ID of the quality checker |

### Step 3: Decision Making

`PATCH /organizations/:orgId/reception-batches/:id/decision`

Records the routing decision for the batch. The batch must be in `quality_checked` or `received` status.

**Decision options:**

| Decision | Description | Conditional Field |
|---|---|---|
| `direct_sale` | Route to immediate sale | `sales_order_id` |
| `storage` | Move to a warehouse | `destination_warehouse_id` |
| `transformation` | Send for processing | `transformation_order_id` |
| `rejected` | Reject the batch | -- |

After the decision is recorded, the system sends `RECEPTION_BATCH_DECISION` notifications to all other active organization members with details about the decision and quality grade.

### Step 4: Financial Processing

`POST /organizations/:orgId/reception-batches/:id/process-payment`

Processes payment and/or creates accounting journal entries for the batch. The batch must be in `decision_made` status.

**Payment processing** (when `create_payment` is true):
- Creates a `payment_records` entry linked to the worker (`worker_id`)
- Supports `per_unit` payment type with configurable `rate_per_unit` and `units_completed`
- Links to harvest tasks if the batch references a harvest record
- Payment is auto-approved with the requesting user as approver

**Journal entry creation** (when `create_journal_entry` is true):
- Creates a `journal_entries` record with auto-generated entry number (`JE-YYYYMMDD-NNNN`)
- Creates two `journal_items`: a debit entry and a credit entry
- Requires `debit_account_id` and `credit_account_id`
- Entry is auto-posted

After processing, the batch status transitions to `processed`.

### Listing and Filtering

`GET /organizations/:orgId/reception-batches`

Returns paginated results with related entities (warehouse, parcel with farm, crop, harvest, receiver worker, quality checker). Supports the following filters:

| Filter | Description |
|---|---|
| `warehouse_id` | Filter by receiving warehouse |
| `parcel_id` | Filter by parcel |
| `crop_id` | Filter by crop |
| `harvest_id` | Filter by harvest record |
| `status` | Filter by batch status |
| `decision` | Filter by decision type |
| `quality_grade` | Filter by quality grade |
| `date_from` / `date_to` | Date range for reception date |
| `sortBy` | Sort field (default: `reception_date`) |
| `sortDir` | Sort direction: `asc` or `desc` (default: `desc`) |
| `page` | Page number (default: 1) |
| `pageSize` | Items per page (default: 10) |

The response includes pagination metadata:

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

### Cancellation

`DELETE /organizations/:orgId/reception-batches/:id`

Sets the batch status to `cancelled`. Processed batches cannot be cancelled.

## Key Endpoints

### Warehouses

| Method | Path | Description |
|---|---|---|
| `GET` | `/warehouses` | List all active warehouses |
| `GET` | `/warehouses/:id` | Get a single warehouse |
| `POST` | `/warehouses` | Create a new warehouse |
| `PATCH` | `/warehouses/:id` | Update a warehouse |
| `DELETE` | `/warehouses/:id` | Soft-delete a warehouse |
| `GET` | `/warehouses/inventory` | Query inventory items (filterable by warehouse and item) |

### Reception Batches

| Method | Path | Description |
|---|---|---|
| `POST` | `/organizations/:orgId/reception-batches` | Create a reception batch (Step 1) |
| `PATCH` | `/organizations/:orgId/reception-batches/:id/quality-control` | Update quality control (Step 2) |
| `PATCH` | `/organizations/:orgId/reception-batches/:id/decision` | Make routing decision (Step 3) |
| `POST` | `/organizations/:orgId/reception-batches/:id/process-payment` | Process payment (Step 4) |
| `GET` | `/organizations/:orgId/reception-batches` | List batches with filters and pagination |
| `GET` | `/organizations/:orgId/reception-batches/:id` | Get a single batch with relations |
| `PATCH` | `/organizations/:orgId/reception-batches/:id` | General update (non-terminal batches only) |
| `DELETE` | `/organizations/:orgId/reception-batches/:id` | Cancel a batch |

## Database Tables

| Table | Purpose |
|---|---|
| `warehouses` | Physical storage locations with capacity and environmental controls |
| `inventory_items` | Current stock levels per item per warehouse |
| `items` | Master item catalog (item code, name, default unit) |
| `reception_batches` | Inbound batch records with full lifecycle tracking |
| `harvest_records` | Linked harvest data for traceability |
| `payment_records` | Worker payment records generated from batch processing |
| `journal_entries` | Accounting journal entries for financial processing |
| `journal_items` | Debit/credit line items within journal entries |
