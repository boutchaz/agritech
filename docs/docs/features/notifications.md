---
sidebar_position: 14
title: "Notifications System"
---

# Notifications System

## Overview

The notifications system provides both **in-app** and **email** notification delivery across all business modules. In-app notifications are persisted in a `notifications` table (via Supabase) and delivered in real time through a **Socket.IO** WebSocket gateway. Email notifications are sent via **Nodemailer** with SMTP configuration controlled by environment variables.

The system is multi-tenant: every notification is scoped to an `organization_id`, and users only receive notifications relevant to their organization context.

## Notification Types

All notification types are defined in the `NotificationType` enum:

| Type | Value | Triggered By |
|------|-------|-------------|
| Task Assigned | `task_assigned` | Workforce module |
| Task Status Changed | `task_status_changed` | Workforce module |
| Task Reminder | `task_reminder` | Reminders cron job |
| Order Status Changed | `order_status_changed` | Marketplace module |
| Quote Received | `quote_received` | Marketplace module |
| Quote Responded | `quote_responded` | Marketplace module |
| Harvest Completed | `harvest_completed` | Production module |
| Low Inventory | `low_inventory` | Stock check endpoint |
| Payment Processed | `payment_processed` | Accounting module |
| Audit Reminder | `audit_reminder` | Compliance cron job |
| Certification Expiry | `certification_expiry` | Compliance cron job |
| Satellite Download Complete | `satellite_download_complete` | Satellite indices module |
| Calibration Complete | `calibration_complete` | AI calibration pipeline |
| Calibration Failed | `calibration_failed` | AI calibration pipeline |
| Critical Alert | `critical_alert` | AI alerts pipeline |
| Season Reminder | `season_reminder` | AI jobs cron |
| Sales Order Created | `sales_order_created` | Accounting module |
| Sales Order Status Changed | `sales_order_status_changed` | Accounting module |
| Purchase Order Created | `purchase_order_created` | Accounting module |
| Purchase Order Status Changed | `purchase_order_status_changed` | Accounting module |
| Stock Entry Created | `stock_entry_created` | Inventory module |
| Reception Batch Decision | `reception_batch_decision` | Quality module |
| Quality Inspection Completed | `quality_inspection_completed` | Quality module |
| Delivery Status Changed | `delivery_status_changed` | Logistics module |
| Delivery Completed | `delivery_completed` | Logistics module |
| Member Added | `member_added` | Organization management |
| Member Removed | `member_removed` | Organization management |
| Role Changed | `role_changed` | Organization management |
| Worker Added | `worker_added` | Workforce module |
| General | `general` | Test / manual triggers |

## In-App Notifications

### Creating Notifications

The `NotificationsService.createNotification()` method inserts a row into the `notifications` table and immediately pushes it to the user via WebSocket:

- The notification is persisted with `is_read: false`.
- After insertion, `gateway.sendToUser(userId, data)` emits the notification to all of the user's connected Socket.IO clients.
- Bulk creation is supported via `createNotificationsForUsers()`, which inserts multiple rows and emits to each user individually.

### Built-in Trigger Helpers

The service exposes dedicated helper methods that other modules call directly:

- **`notifyTaskAssignment()`** -- sends a `task_assigned` notification when a task is assigned to a worker.
- **`notifyOrderStatusChange()`** -- sends an `order_status_changed` notification with human-readable status labels (confirmed, shipped, delivered, cancelled).
- **`notifyQuoteReceived()`** -- notifies a seller when a buyer requests a quote.
- **`notifyQuoteResponded()`** -- notifies a buyer when a seller responds with a quoted price.
- **`checkLowStockAndNotify()`** -- queries `inventory_items` and `product_variants` for items where current quantity is at or below the reorder level, then creates `low_inventory` notifications for all active users in the organization. Rate-limited to one check per hour per organization.

### Reading & Managing Notifications

Notifications are retrieved via query with optional filters for `isRead`, `type`, `limit`, and `offset`. Default page size is 50. Results are ordered by `created_at` descending.

Marking as read updates the `is_read` flag and `read_at` timestamp, then emits a `notification:read` event via WebSocket so all connected clients for that user stay in sync.

## Socket.IO Real-Time Delivery

### Gateway Configuration

The `NotificationsGateway` is a NestJS WebSocket gateway listening on the `/notifications` namespace. CORS is configured to allow connections from `localhost`, `*.thebzlab.online`, and origins containing `agritech`.

### Authentication

Clients must provide a JWT token either as a query parameter (`?token=...`) or via the `Authorization: Bearer ...` header. The gateway verifies the token using `SUPABASE_JWT_SECRET` or `JWT_SECRET`. Connections without a valid token are immediately disconnected.

### Room Architecture

Upon connection, authenticated clients are placed into:

- **User room** (`user:<userId>`) -- for user-specific notifications.
- **Organization room** (`org:<organizationId>`) -- for organization-wide broadcasts (joined if `organizationId` is provided in the handshake query).

Clients can switch organizations at runtime by sending a `join-organization` message.

### WebSocket Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Server to Client | `connected` | Emitted on successful authentication with `userId`, `organizationId`, `socketId` |
| Server to Client | `notification:new` | New notification payload |
| Server to Client | `notification:read` | Single notification marked as read (syncs across devices) |
| Server to Client | `notification:read-all` | All notifications marked as read |
| Client to Server | `join-organization` | Switch to a different organization room |
| Client to Server | `mark-read` | Request to mark a specific notification as read |
| Client to Server | `mark-all-read` | Request to mark all notifications as read |

### Connection Tracking

The gateway maintains a `Map<string, Set<string>>` mapping user IDs to their connected socket IDs. This supports:

- `isUserConnected(userId)` -- check if a user has at least one active socket.
- `getConnectedUsersCount()` -- total number of distinct connected users.
- Multi-device support: a single user can have multiple simultaneous connections.

## Email Notifications

### SMTP Configuration

Email sending is powered by Nodemailer. It is enabled only when the `EMAIL_ENABLED` environment variable is set to `true`. Required environment variables:

| Variable | Description |
|----------|-------------|
| `EMAIL_ENABLED` | Set to `true` to activate email sending |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port (default `587`; port `465` uses implicit TLS) |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |
| `EMAIL_FROM` | Sender address (falls back to `EMAIL_USER`) |

### Marketplace Email Templates

The module includes a set of marketplace-specific HTML email templates defined in `templates/marketplace-templates.ts`. These are functions that accept structured data and return `{ subject, html, text }` objects:

| Template | Recipient | Purpose |
|----------|-----------|---------|
| `orderPlaced` | Seller | New order received with item list and total |
| `orderConfirmed` | Buyer | Order confirmed by seller |
| `orderShipped` | Buyer | Order shipped with optional tracking number |
| `quoteRequestReceived` | Seller | New quote request with product and quantity |
| `quoteResponded` | Buyer | Seller responded with a quoted price |
| `newReview` | Seller | New customer review with rating |

All marketplace email templates are localized in French.

## REST API Endpoints

All endpoints require JWT authentication and the `x-organization-id` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications with optional `isRead`, `type`, `limit`, `offset` filters |
| `GET` | `/notifications/unread/count` | Get unread notification count |
| `PATCH` | `/notifications/:id/read` | Mark a single notification as read |
| `POST` | `/notifications/read-all` | Mark all notifications as read |
| `GET` | `/notifications/connection-status` | Check WebSocket connection status for current user |
| `POST` | `/notifications/test` | Send a test notification (development) |
| `POST` | `/notifications/stock/check` | Trigger low-stock check and create notifications |
| `GET` | `/notifications/stock/low` | Get all low-stock items for the organization |

## Key Source Files

| File | Purpose |
|------|---------|
| `notifications.service.ts` | Core notification creation, retrieval, email sending, low-stock logic |
| `notifications.gateway.ts` | Socket.IO WebSocket gateway for real-time delivery |
| `notifications.controller.ts` | REST API endpoints |
| `dto/notification.dto.ts` | `NotificationType` enum, DTOs for create/response/filter |
| `templates/marketplace-templates.ts` | HTML email templates for marketplace events |
