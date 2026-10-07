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

**Provider priority:** Shipox/3rd Mile is the user's selected carrier and is preferred when configured. Mapit remains the fallback when Shipox is not configured; if neither is configured, no automatic shipment is created.

**Why:** On 2026-10-06 the user explicitly selected Shipox/3rd Mile for shipping. Do not let an older Mapit-first rule override that choice.

**How to apply:** Keep Shipox first for automatic delivery orders, with Mapit as a continuity fallback until Shipox is configured.

**Shipox readiness:** Do not treat non-empty credentials as proof that the carrier works. Require both sender details and a successful authenticated account check before exposing Shipox at checkout or accepting a Shipox order. Cache the check briefly and expose only a safe status code, not credentials or raw API response text.

**Why:** Credentials can be present in Replit while the carrier API rejects authentication; allowing checkout based on presence alone risks accepting paid orders that cannot be shipped.

**How to apply:** Keep the customer-facing availability endpoint and server-side order guard tied to authenticated health. Health checks must not create shipments.

**Storage X vs. Shipox:** The Storage X Ship Partner API at `shipping.3rdmile.net/api/public/partner/v1` uses a bearer API key. The Shipox customer API at `3rdmile.my.shipox.com/api/v1/customer/authenticate` uses username/password. These are separate integrations despite both using 3rd Mile branding.

**Why:** Testing Storage X credentials against Shipox's customer-auth endpoint can produce a misleading 400 and send diagnosis in the wrong direction.

**How to apply:** Match the vendor's exact docs, base URL, auth method, payload, and secret names before testing or changing carrier readiness. A health check for one API says nothing about the other.

**Customer tariff vs. partner quote:** Treat the merchant-supplied Storage Station rate sheet as the customer-facing tariff, separate from the Storage X partner API quote. The partner quote may differ; do not claim that customer charges and carrier billing reconcile until verified.

**Why:** The API quote returned prices that differed from the supplied rate sheet, so silently using either amount for both customer pricing and carrier cost could create an unexpected margin gap.

**How to apply:** Keep the rate-card charge and API quote distinct, surface discrepancies, and confirm the provider's billing basis before describing automatic shipping as financially reconciled.

**Webhook:** `POST /api/webhooks/mapit` — no auth required (IP filtering should be added later). Looks up order by `mapitOrderNumber`. Status mapping: `ORDER_COMPLETED` → `completed`, `ORDER_FAILED_TO_DROP_OFF` → `returned`, etc.

**Mongoose $in typing:** When using `$in` with a `string[]` variable in Mongoose 9, cast with `as any[]` to satisfy strict enum types, e.g. `{ status: { $in: arr as any[] } }`.

**Tracking URL:** `https://www.mapit.sa/customer/track/{orderNumber}`
