---
name: Coupon cashback safety
description: Safe lifecycle requirements before enabling cashback-type coupons at checkout.
---

Do not apply cashback coupons at checkout until cashback credits are tied to confirmed payment and can be reversed safely.

**Why:** Crediting on order creation can grant funds before card or cash-on-delivery payment succeeds, while cancellation, refunds, and expired pending orders must not leave extra wallet balance or reverse it twice.

**How to apply:** Credit cashback once after confirmed payment. Add idempotent reversals for refunds, cancellation, and expired pending-payment orders, and test repeated payment callbacks before enabling the coupon type.
