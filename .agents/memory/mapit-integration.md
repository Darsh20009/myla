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

**Storage X merchant handoff:** When a partner API key ships on behalf of a merchant account, include that merchant's `merchantRef` at the top level of both quote and create requests. Omitting it bills the API-key owner; a valid tracking lookup does not prove the shipment appears in the merchant's dashboard.

**Why:** The partner docs define `merchantRef` as the merchant handoff code and say omission bills the API-key owner. A shipment created without it was trackable through the API but absent from the merchant's shipment list.

**How to apply:** Obtain the `SXH-…` handoff code from Storage X, store it separately from the API key, and pass it to quote/create. Do not use an `sxs_…` API key as `merchantRef`; adding the field affects new shipments, not previously created ones.

**Customer tariff vs. partner quote:** Treat the merchant-supplied Storage Station rate sheet as the customer-facing tariff, separate from the Storage X partner API quote. The partner quote may differ; do not claim that customer charges and carrier billing reconcile until verified.

**Why:** The API quote returned prices that differed from the supplied rate sheet, so silently using either amount for both customer pricing and carrier cost could create an unexpected margin gap.

**How to apply:** Keep the rate-card charge and API quote distinct, surface discrepancies, and confirm the provider's billing basis before describing automatic shipping as financially reconciled.

**Rate-card authority:** The user confirmed the latest Storage Station sheet replaces the previous one: domestic KSA is SAR 19 up to 15 kg, +SAR 1/kg above that, COD SAR 5/order; GCC is SAR 38 for the first 0.5 kg then SAR 9 per additional 0.5 kg; returns are listed at the original shipping rate; SMSA fuel surcharge is SAR 1.5/order.

**Why:** The user explicitly said to use only the newly supplied carrier table.

**How to apply:** Use the sheet, not the partner quote, for customer prices. Keep SMSA fuel conditional on SMSA service and apply return rates only in the return flow. GCC rates require an enabled country/address path; do not expose unlisted destinations or fees.

**User decision while pricing is pending:** Keep Storage X available at checkout using the merchant's rate-card prices, even while the partner quote differs. The store may absorb a difference if the quote reflects the eventual bill.

**Why:** The user chose to keep the shipping option enabled after being shown the possible price gap.

**How to apply:** Do not disable Storage X or replace the customer tariff with the API quote without a new instruction; keep the discrepancy visible until the provider confirms billing.

**Storage X phone format:** Shipment creation expects Saudi mobile numbers in local `05XXXXXXXX` format. Normalize stored international forms such as `+9665...` or `9665...` before sending.

**Why:** The partner rejected the stored international form as `invalid_recipient_phone`; its create examples use the local 05 format.

**How to apply:** Normalize both pickup and recipient phones at the API boundary, and make readiness validate that a stored number can be normalized.

**Storage X cancellation:** A shipment can be cancelled outright before carrier pickup; once moving, the carrier routes it to a hub and returns it. Cancellation does not guarantee that fees are waived.

**Why:** The partner's cancellation response depends on parcel custody, so an immediate cancel can still leave return handling or charges.

**How to apply:** Report the returned status/custody and never promise that create-then-cancel is free.

**Webhook:** `POST /api/webhooks/mapit` — no auth required (IP filtering should be added later). Looks up order by `mapitOrderNumber`. Status mapping: `ORDER_COMPLETED` → `completed`, `ORDER_FAILED_TO_DROP_OFF` → `returned`, etc.

**Mongoose $in typing:** When using `$in` with a `string[]` variable in Mongoose 9, cast with `as any[]` to satisfy strict enum types, e.g. `{ status: { $in: arr as any[] } }`.

**Tracking URL:** `https://www.mapit.sa/customer/track/{orderNumber}`
