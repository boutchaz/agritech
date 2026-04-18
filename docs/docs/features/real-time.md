---
sidebar_position: 6
---

# Real-time Communication

## Overview

The platform uses Socket.IO for real-time communication between the backend and frontend. All real-time events flow through a single gateway scoped to the `/notifications` namespace.

## Architecture

```mermaid
flowchart LR
    subgraph Backend
        GW[NotificationsGateway\n/notifications]
        NS[NotificationsService]
        GW --> NS
    end
    subgraph Rooms
        UR[user:{userId}]
        OR[org:{organizationId}]
    end
    subgraph Frontend
        SM[socketManager singleton]
        CS[useCalibrationSocket]
        CP[useCalibrationProgress]
        UN[useNotifications]
    end
    GW --> UR
    GW --> OR
    SM --> GW
    CS --> SM
    CP --> SM
    UN --> SM
```

- **Gateway**: `NotificationsGateway` at the `/notifications` namespace
- **Transport**: Socket.IO via `IoAdapter`
- **Authentication**: JWT token from query params or `Authorization` header
- **Rooms**: `user:{userId}` for per-user events, `org:{organizationId}` for org-wide events

## Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `calibration:phase-changed` | Server to Client | `{ parcel_id, from_phase, to_phase }` | AI phase transition |
| `calibration:progress` | Server to Client | `{ parcel_id, calibration_id, step, total_steps, step_key, message, percent }` | Live calibration progress |
| `calibration:failed` | Server to Client | `{ parcel_id, calibration_id, error_message }` | Calibration failure |
| `notification:new` | Server to Client | Notification object | New notification created |
| `notification:read` | Server to Client | `{ notificationId, readAt }` | Single notification marked read |
| `notification:read-all` | Server to Client | `{ readAt }` | All notifications marked read |
| `join-organization` | Client to Server | `{ organizationId }` | Join the org room |

## Frontend Integration

The frontend uses a `socketManager` singleton that manages the connection lifecycle: connecting on login, disconnecting on logout, and reconnecting on token refresh.

### Calibration Hooks

**`useCalibrationSocket(parcelId)`**

Listens for `calibration:phase-changed` events scoped to the given parcel. On each phase change, it automatically invalidates the relevant TanStack Query caches so UI components re-fetch updated state without manual intervention.

**`useCalibrationProgress(parcelId)`**

Tracks live calibration progress as React state by listening to `calibration:progress` events. Exposes `{ step, totalSteps, stepKey, message, percent }`. Automatically resets to initial state when a phase change event is received.

### Notification Hook

**`useNotifications`**

Subscribes to `notification:new`, `notification:read`, and `notification:read-all` events. Updates the local notification list in real time and keeps the unread count in sync.

## Key Files

| File | Purpose |
|------|---------|
| `agritech-api/src/modules/notifications/notifications.gateway.ts` | Socket.IO gateway |
| `agritech-api/src/modules/notifications/notifications.service.ts` | Notification management |
| `project/src/lib/socket.ts` | Frontend socket manager singleton |
| `project/src/hooks/useCalibrationSocket.ts` | Calibration socket hooks |
| `project/src/hooks/useNotifications.ts` | Notification hooks |
