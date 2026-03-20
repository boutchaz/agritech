---
sidebar_position: 9
title: "Marketplace"
---

# Marketplace

The AgriTech Marketplace is a B2B e-commerce platform that allows agricultural organizations to list, browse, and trade products. It combines two product sources -- dedicated marketplace listings and inventory items flagged for sale -- into a unified storefront. The system includes seller profiles, shopping carts, quote requests, orders with stock management, and a review system.

## Architecture Overview

The marketplace spans two applications:

- **API** (`agritech-api`): A NestJS module at `src/modules/marketplace/` containing six sub-services (marketplace, cart, orders, sellers, quote-requests, reviews). Separate modules for formal quotes (`src/modules/quotes/`) and sales orders (`src/modules/sales-orders/`) handle the internal accounting side.
- **Frontend** (`marketplace-frontend`): A Next.js application with public-facing storefront pages and authenticated dashboard/order management pages.

### Database Tables

| Table | Purpose |
|-------|---------|
| `marketplace_listings` | Dedicated marketplace product listings created by sellers |
| `items` | Inventory items; those with `is_sales_item=true`, `is_active=true`, and `show_in_website=true` appear in the marketplace |
| `organizations` | Seller profiles (organizations that have products) |
| `marketplace_carts` | Per-user shopping carts |
| `marketplace_cart_items` | Individual items in a cart |
| `marketplace_orders` | Orders placed by buyers, grouped by seller |
| `marketplace_order_items` | Line items within an order |
| `marketplace_quote_requests` | Quote requests from buyers to sellers |
| `marketplace_reviews` | Buyer reviews of sellers (tied to delivered orders) |
| `quotes` | Formal quotes with line items (internal accounting module) |
| `quote_items` | Line items within a formal quote |
| `sales_orders` | Sales orders with stock tracking and invoicing |
| `sales_order_items` | Line items within a sales order |

### Module Registration

The `MarketplaceModule` (`src/modules/marketplace/marketplace.module.ts`) imports `DatabaseModule`, `StrapiModule` (for CMS-managed categories), and `NotificationsModule`. It registers six controllers and their corresponding services:

- `MarketplaceController` / `MarketplaceService`
- `CartController` / `CartService`
- `OrdersController` / `OrdersService`
- `SellersController` / `SellersService`
- `QuoteRequestsController` / `QuoteRequestsService`
- `ReviewsController` / `ReviewsService`

## Product Management

### Dual Product Sources

The marketplace aggregates products from two database tables:

1. **Marketplace Listings** (`marketplace_listings`): Standalone listings created directly by sellers through the marketplace dashboard. Filtered by `is_public=true` and `status='active'`.

2. **Inventory Items** (`items`): Items from the inventory module that are flagged for sale. Filtered by `is_sales_item=true`, `is_active=true`, and `show_in_website=true`.

Each product returned by the API includes a `source` field (`'marketplace_listing'` or `'inventory_item'`) so the frontend can distinguish between them. Inventory items are transformed to match the marketplace listing format, using `item_name` as `title`, `standard_rate` as `price`, and `website_description` (falling back to `description`) as the product description.

### Product Querying

Products are queried through `GET /marketplace/products` with the following filters (defined in `GetProductsQueryDto`):

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Category UUID or slug to filter by |
| `search` | string | Text search across title/name and description |
| `sort` | enum | `newest` (default), `price_asc`, `price_desc` |
| `min_price` | number | Minimum price filter |
| `max_price` | number | Maximum price filter |
| `page` | number | Page number (enables paginated response) |
| `limit` | number | Items per page (default 20) |

When `page` and `limit` are omitted, the API returns a flat array for backward compatibility. When provided, it returns a paginated response with `data`, `total`, `page`, `limit`, and `totalPages`.

### Listing Management (Authenticated)

Sellers manage their listings through these endpoints, all protected by `JwtAuthGuard`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/marketplace/my-listings` | Get the current seller's own listings |
| `POST` | `/marketplace/listings` | Create a new listing |
| `PATCH` | `/marketplace/listings/:id` | Update a listing (ownership verified) |
| `DELETE` | `/marketplace/listings/:id` | Delete a listing (ownership verified) |

A listing includes: `title`, `description`, `short_description`, `price`, `unit`, `product_category_id`, `images` (array of URLs), `quantity_available`, `sku`, `status`, and `is_public`. The currency defaults to `MAD`.

### Categories

Categories are managed through a headless CMS (Strapi) and exposed via public endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/marketplace/categories` | All categories (with optional `locale` query) |
| `GET` | `/marketplace/categories/featured` | Featured categories for the homepage |
| `GET` | `/marketplace/categories/:slug` | Single category by slug |

### Product Images

Product images stored in private Supabase storage are served through a public proxy endpoint:

```
GET /products/images/:filename
```

This generates a short-lived signed URL (60-second expiry) and streams the image with CDN-friendly cache headers (browser: 1 hour, CDN: 24 hours).

## Seller Profiles

Sellers are organizations that have at least one active product. The `SellersService` queries the `organizations` table and enriches each result with product counts (from both `marketplace_listings` and `items`) and review statistics.

### Seller Profile Fields

```typescript
interface SellerProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_verified?: boolean;   // Placeholder, not yet implemented
  created_at: string;
  product_count: number;   // Combined listings + items count
  average_rating?: number; // Calculated from reviews
  review_count: number;
}
```

### Seller Endpoints (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/marketplace/sellers` | List sellers with filters: `city`, `category`, `search`, `page`, `limit` |
| `GET` | `/marketplace/sellers/cities` | List of cities that have active sellers |
| `GET` | `/marketplace/sellers/:slug` | Seller profile by slug or UUID |
| `GET` | `/marketplace/sellers/:slug/products` | Seller's products (paginated) |
| `GET` | `/marketplace/sellers/:slug/reviews` | Seller's reviews (paginated) |

Only organizations that have at least one product appear in seller listings. The service filters out organizations with zero products.

## Shopping Cart

The cart system uses `marketplace_carts` (one per user) and `marketplace_cart_items`. All cart endpoints require authentication.

### Cart Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/marketplace/cart` | Get cart with items and calculated totals |
| `POST` | `/marketplace/cart/items` | Add item to cart |
| `PATCH` | `/marketplace/cart/items/:id` | Update item quantity |
| `DELETE` | `/marketplace/cart/items/:id` | Remove item from cart |
| `DELETE` | `/marketplace/cart/clear` | Clear entire cart |

### Stock Validation

When adding to or updating cart items, the service validates stock availability:

- **Marketplace listings**: Checks `quantity_available` on the listing.
- **Inventory items**: Sums `remaining_quantity` across all `stock_valuation` batches for the item.

If the requested quantity exceeds available stock, the request is rejected with a descriptive error message including the available amount.

### Add to Cart DTO

```typescript
class AddToCartDto {
  listing_id?: string;  // Either listing_id or item_id required
  item_id?: string;
  quantity: number;     // Minimum: 0.01
}
```

If the same product is already in the cart, the quantity is incremented rather than creating a duplicate entry.

## Quote Request Workflow

The quote request system enables buyers to request pricing from sellers before placing orders. It operates on the `marketplace_quote_requests` table.

### Quote Request Statuses

```
pending --> viewed --> responded/quoted --> accepted
                                       --> cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Initial state after buyer submits request |
| `viewed` | Auto-set when the seller first views the request |
| `responded` | Seller replied without a specific price |
| `quoted` | Seller provided a specific price |
| `accepted` | Buyer accepted the quote |
| `cancelled` | Buyer cancelled the request |

### Quote Request Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/marketplace/quote-requests` | Yes | Create a new quote request |
| `GET` | `/marketplace/quote-requests/sent` | Yes | Buyer's outgoing requests (filter by `status`) |
| `GET` | `/marketplace/quote-requests/received` | Yes | Seller's incoming requests (filter by `status`) |
| `GET` | `/marketplace/quote-requests/stats` | Yes | Seller statistics (total, pending, responded, accepted counts) |
| `GET` | `/marketplace/quote-requests/:id` | Yes | Get single request (auto-marks as viewed for seller) |
| `PATCH` | `/marketplace/quote-requests/:id` | Yes | Update request (seller responds or buyer accepts/cancels) |

### Notifications

Quote requests trigger both email and in-app notifications:

- **New request**: Email sent to seller organization email; in-app notification to seller org admins/managers/owners.
- **Seller responds**: Email sent to buyer contact email (or org email); in-app notification to buyer org admins/managers/owners.

### Create Quote Request DTO

```typescript
class CreateQuoteRequestDto {
  item_id?: string;               // Either item_id or listing_id required
  listing_id?: string;
  product_title: string;
  product_description?: string;
  requested_quantity?: number;
  unit_of_measure?: string;
  message?: string;
  buyer_contact_name?: string;
  buyer_contact_email?: string;
  buyer_contact_phone?: string;
  seller_organization_id: string;  // Required
}
```

## Marketplace Order Management

Orders are created from the shopping cart and grouped by seller (one order per seller organization). All order endpoints require authentication.

### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/marketplace/orders` | Create order(s) from cart |
| `GET` | `/marketplace/orders` | List orders (filter by `role`: `buyer` or `seller`) |
| `GET` | `/marketplace/orders/:id` | Get single order with items |
| `PATCH` | `/marketplace/orders/:id/status` | Update status (seller only) |
| `POST` | `/marketplace/orders/:id/cancel` | Cancel order (buyer only, pending/confirmed only) |

### Order Status Flow

```
pending --> confirmed --> shipped --> delivered
   |           |
   v           v
cancelled  cancelled
```

Valid transitions enforced by the service:

| From | Allowed Transitions |
|------|-------------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | (terminal) |
| `cancelled` | (terminal) |
| `disputed` | `cancelled` |

### Stock Deduction on Order Creation

When an order is created:

1. **Marketplace listings**: `quantity_available` is decremented directly on the listing.
2. **Inventory items**: A `stock_movements` OUT entry is created using FIFO valuation from `stock_valuation`, and `remaining_quantity` is updated.

Each order item tracks `stock_deducted` (boolean) and `stock_movement_id` for auditability.

### Stock Restoration on Cancellation

When a buyer cancels an order:

- **Listing stock**: `quantity_available` is restored.
- **Inventory stock**: A reverse IN stock movement is created, and `stock_valuation.remaining_quantity` is restored.

### Create Order DTO

```typescript
class CreateOrderDto {
  shipping_details: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    postal_code?: string;
  };
  payment_method: 'cod' | 'online';
  notes?: string;
}
```

### Order Notifications

- **Order created**: Confirmation email to buyer; new order notification email to seller.
- **Status updated**: Status update email to buyer; in-app notification if buyer has a user account.
- **Order cancelled**: Cancellation email to buyer.

## Reviews

Buyers can leave reviews for sellers after an order is delivered. Reviews are stored in `marketplace_reviews` and tied to a specific order.

### Review Rules

- Only buyers with at least one `delivered` order from the seller can review.
- Each order can only be reviewed once.
- Rating is 1-5 (integer scale).
- After a review is created, the seller's `average_rating` and `review_count` on the `organizations` table are recalculated.

### Review Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/marketplace/reviews/can-review/:sellerId` | Yes | Check if user can review this seller |
| `POST` | `/marketplace/reviews` | Yes | Submit a review |

### Create Review DTO

```typescript
class CreateReviewDto {
  reviewee_organization_id: string;
  order_id: string;
  rating: number;   // 1-5
  comment?: string;
}
```

## Formal Quotes (Accounting Module)

Separate from marketplace quote requests, the `quotes` module (`src/modules/quotes/`) handles formal business quotes with line items, tax calculations, and conversion to sales orders. All endpoints require `JwtAuthGuard` and `OrganizationGuard`.

### Quote Statuses and Transitions

```
draft --> sent --> accepted --> converted
  |        |
  v        v
cancelled  rejected
```

Terminal states: `rejected`, `converted`, `cancelled`, `expired`.

### Quote Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/quotes` | List quotes with filters (status, customer, date range, search, pagination) |
| `GET` | `/quotes/:id` | Get quote with line items |
| `POST` | `/quotes` | Create quote (auto-generates quote number) |
| `PATCH` | `/quotes/:id` | Update quote (drafts only) |
| `PATCH` | `/quotes/:id/status` | Update status with transition validation |
| `POST` | `/quotes/:id/convert-to-order` | Convert accepted quote to sales order |
| `DELETE` | `/quotes/:id` | Delete quote (drafts only) |

Quote items support discounts (`discount_percent`), tax calculations (from `taxes` table or inline `tax_rate`), and automatic total computation (subtotal, tax_total, grand_total). Currency defaults to `MAD`.

## Sales Orders (Accounting Module)

The `sales-orders` module (`src/modules/sales-orders/`) manages formal sales orders with inventory integration, stock issuance, COGS journal entries, and invoice conversion.

### Sales Order Status Flow

```
draft --> confirmed --> processing --> shipped --> delivered --> completed
  |          |              |
  v          v              v
cancelled  cancelled     cancelled
```

Additional constraint: orders cannot be shipped unless `stock_issued` is `true`.

### Sales Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sales-orders` | Create sales order (auto-generates order number) |
| `GET` | `/sales-orders` | List with filters (status, customer, date range, stock_issued, search) |
| `GET` | `/sales-orders/:id` | Get order with line items |
| `PATCH` | `/sales-orders/:id` | Update order |
| `PATCH` | `/sales-orders/:id/status` | Update status with transition validation |
| `DELETE` | `/sales-orders/:id` | Delete order (drafts only) |
| `POST` | `/sales-orders/:id/convert-to-invoice` | Convert to invoice |
| `POST` | `/sales-orders/:id/issue-stock` | Issue stock from warehouse (requires `warehouse_id` query param) |

### Stock Issuance

The `issue-stock` endpoint:

1. Validates the order is confirmed (not draft or cancelled) and stock has not already been issued.
2. Creates a `Material Issue` stock entry via `StockEntriesService` for all items with an `item_id`.
3. Marks the sales order with `stock_issued=true` and records the `stock_entry_id`.
4. Creates a COGS journal entry (Dr. Cost of Goods Sold account `6115`, Cr. Inventory account `3500`).

### Invoice Conversion

The `convert-to-invoice` endpoint:

1. Calculates remaining uninvoiced quantities per line item.
2. Generates an invoice number via `SequencesService`.
3. Creates the invoice and invoice items.
4. Updates `invoiced_quantity` on the sales order items.
5. Database triggers handle updating the sales order's `invoiced_amount`, `outstanding_amount`, and status transitions (`partially_invoiced` / `invoiced`).

## Seller Dashboard

Authenticated sellers can access dashboard statistics via:

```
GET /marketplace/dashboard/stats
```

This returns:

```json
{
  "listingsCount": 15,
  "salesItemsCount": 10,
  "marketplaceListingsCount": 5,
  "ordersCount": 3,
  "revenue": 0
}
```

The stats are scoped to the authenticated user's organization via RLS-scoped Supabase client.

## Frontend Application Structure

The marketplace frontend (`marketplace-frontend/`) is a Next.js application with the following route groups:

### Public Routes (`(public)/`)

| Route | Page | Description |
|-------|------|-------------|
| `/` | `page.tsx`, `HomeContent.tsx` | Landing page with featured categories and products |
| `/products` | `page.tsx`, `ProductsGrid.tsx` | Product listing with filters |
| `/products/[id]` | `page.tsx`, `ProductActions.tsx`, `QuoteRequestButton.tsx`, `ImageGallery.tsx` | Product detail with add-to-cart, quote request, image gallery |
| `/categories` | `page.tsx`, `CategoriesContent.tsx` | Browse all categories |
| `/categories/[slug]` | `page.tsx`, `CategoryProducts.tsx` | Products filtered by category |
| `/sellers` | `page.tsx`, `SellersContent.tsx` | Seller directory |
| `/sellers/[slug]` | `page.tsx`, `SellerProfile.tsx` | Individual seller profile with products and reviews |
| `/cart` | `page.tsx` | Shopping cart |
| `/checkout` | `page.tsx` | Checkout flow |
| `/checkout/confirmation` | `page.tsx` | Order confirmation |
| `/login` | `page.tsx` | Login page |
| `/signup` | `page.tsx` | Registration page |

### Authenticated Routes (`(auth)/`)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | `page.tsx` | Seller dashboard with stats |
| `/dashboard/listings` | `page.tsx` | Manage product listings |
| `/dashboard/listings/new` | `page.tsx` | Create new listing |
| `/dashboard/listings/[id]/edit` | `page.tsx` | Edit existing listing |
| `/quote-requests` | `page.tsx` | Manage quote requests (sent and received) |
| `/orders` | `page.tsx` | Order list (buyer and seller views) |
| `/orders/[id]` | `page.tsx` | Order detail |

## Key File Paths

### API (`agritech-api/src/modules/`)

| Path | Purpose |
|------|---------|
| `marketplace/marketplace.module.ts` | Module registration |
| `marketplace/marketplace.controller.ts` | Products, listings, categories, dashboard |
| `marketplace/marketplace.service.ts` | Product queries, listing CRUD |
| `marketplace/cart.controller.ts` | Cart endpoints |
| `marketplace/cart.service.ts` | Cart logic with stock validation |
| `marketplace/orders.controller.ts` | Order endpoints |
| `marketplace/orders.service.ts` | Order creation, status, stock deduction/restoration |
| `marketplace/sellers.controller.ts` | Seller directory endpoints |
| `marketplace/sellers.service.ts` | Seller queries with product counts and ratings |
| `marketplace/quote-requests.controller.ts` | Quote request endpoints |
| `marketplace/quote-requests.service.ts` | Quote request lifecycle and notifications |
| `marketplace/reviews.controller.ts` | Review endpoints |
| `marketplace/reviews.service.ts` | Review creation, eligibility checks, rating updates |
| `marketplace/dto/` | Validation DTOs for all marketplace operations |
| `products/products.controller.ts` | Product image proxy endpoint |
| `quotes/quotes.controller.ts` | Formal quote CRUD and conversion |
| `quotes/quotes.service.ts` | Quote logic with tax calculations |
| `sales-orders/sales-orders.controller.ts` | Sales order CRUD, stock issuance, invoicing |
| `sales-orders/sales-orders.service.ts` | Sales order logic with COGS journal entries |

### Frontend (`marketplace-frontend/src/`)

| Path | Purpose |
|------|---------|
| `app/(public)/` | Public storefront pages |
| `app/(auth)/` | Authenticated seller/buyer dashboard pages |
| `components/` | Shared UI components |
| `contexts/` | React context providers |
| `hooks/` | Custom React hooks |
| `lib/` | API client and utilities |
| `i18n/` | Internationalization |
| `providers/` | Application-level providers |
| `middleware.ts` | Next.js middleware (auth, routing) |
