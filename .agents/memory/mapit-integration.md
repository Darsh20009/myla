---
name: Mapit integration
description: Mapit shipping API (mapit.sa) wired into Myla; key gotchas for coordinates, idempotency, and Mongoose typing.
---

# Mapit integration

## Key files
- `server/mapit.ts` — API client (create/get/list/update/delete orders, webhook status mapping)
- `server/routes.ts` — auto-creation in `dispatchOrderPaidSideEffects`, admin routes `/api/admin/mapit/*`, public webhook `POST /api/webhooks/mapit`
- `server/models.ts` — Order schema: `mapitOrderNumber`, `mapitStatus`, `mapitCreatedAt`, `mapitError`, `mapitTrackingUrl`
- `shared/schema.ts` — Matching Zod fields
- `client/src/pages/Admin.tsx` — Mapit panel in order details (create, retry, sync status, open tracking, cancel)
- `client/src/pages/admin/AdminIntegrations.tsx` — Mapit card in integrations list

## Rules / gotchas

**Why:** Mapit requires `user.location.coordinates` (lon, lat array). Orders without `latitude`/`longitude` fields will throw at creation time. Do not silently skip — throw so the admin sees the error.

**How to apply:** If adding a Mapit order creation path (manual or auto), always call `addressForMapit(order)` which validates coordinates. Catch and surface the error to the admin panel.

**Idempotency:** `dispatchOrderPaidSideEffects` re-fetches the order before calling `createMapitOrder`. If `mapitOrderNumber` is already set and `mapitStatus !== "failed"`, it skips. Admin create route also returns early if shipment exists and is not failed.

**Provider priority:** Mapit is primary. Shipox/3rd Mile is fallback — it only runs when `isMapitConfigured()` returns false. Both configured at once → Mapit wins, Shipox is skipped.

**Webhook:** `POST /api/webhooks/mapit` — no auth required (IP filtering should be added later). Looks up order by `mapitOrderNumber`. Status mapping: `ORDER_COMPLETED` → `completed`, `ORDER_FAILED_TO_DROP_OFF` → `returned`, etc.

**Mongoose $in typing:** When using `$in` with a `string[]` variable in Mongoose 9, cast with `as any[]` to satisfy strict enum types, e.g. `{ status: { $in: arr as any[] } }`.

**Tracking URL:** `https://www.mapit.sa/customer/track/{orderNumber}`
