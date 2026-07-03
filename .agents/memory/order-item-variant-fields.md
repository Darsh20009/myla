---
name: Order item variant fields & cart line identity
description: How variant/length/notes flow PDP→cart→order, and the rule that cart line identity must be consistent everywhere.
---

- Order item persistence is gated by TWO schemas that must stay in sync: the Zod object in `shared/schema.ts` (order items) AND the Mongoose subdoc in `server/models.ts`. Zod `z.object()` strips unknown keys by default, so any item field NOT declared in the Zod items schema is silently dropped before it reaches Mongo — even if the email/templates read it.
  - **Why:** color/size were read by order emails but never declared in the items Zod schema, so they were stripped and always came through undefined. Adding a per-item field requires declaring it in both places.
  - **How to apply:** to persist a new order-item field (e.g. length, notes, gift message), add it as optional to the Zod items array in `shared/schema.ts`, to the items subdoc in `server/models.ts`, to the checkout items map in `client/src/pages/Checkout.tsx`, and to any routes.ts email item maps.

- Cart line identity (`client/src/hooks/use-cart.ts`) = `(productId, variantSku, length||"")`. If you change the dedupe key in `addItem`, you MUST update `removeItem`, `updateQuantity`, the `loadFromServer` merge, and the Cart row React `key` to use the SAME composite key — otherwise same-SKU/different-length lines collide (remove/qty hits all matching lines, keys clash).
  - **Why:** introducing length-based dedupe in addItem alone caused remove/update to affect all lines sharing a SKU.
