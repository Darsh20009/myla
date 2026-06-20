---
name: Myla rebrand — kept identifiers & legacy eras
description: Brand is Myla (luxury abayas, Riyadh). Which legacy Fuji-Cafe/RF-Perfume identifiers must be kept, and why brand text leaks recur.
---

# Myla Rebrand

**Brand:** Myla — Abayas by HMBL, Riyadh. Palette: brown `#2C1810`, gold `#C9A882`, off-white `#FAF7F2`. Domain: `myla-abayas.store`.

## Codebase has THREE brand eras layered on top of each other
Fuji Cafe (coffee) → RF Perfume → Myla (abayas). Leftover user-facing copy from all three eras is scattered across server + client. When asked to "fix the AI" or rebrand, grep broadly for: `coffee|قهوة|perfume|عطر|عطور|fragrance|fuji|فوجي|آر اف|RF` and triage each hit as user-visible vs internal identifier.

**Why:** A single grep pass per era is the only reliable way to catch leaks; they hide in fallback strings, email mirrors, test-email samples, AI prompt framing, and default arrays — not just obvious labels.

## Internal identifiers that MUST be kept (renaming breaks contracts/data)
- MongoDB `dbName: "fujicafe"` (auth.ts) and WooCommerce `store: "fujicafe"` — connection/store identifiers.
- POS data-model field names: `coffeeItem`, `CoffeeItem` type, `/api/coffee-items`, `coffeeItemId` — schema/DB shape.
- AI advisor internals: function `perfumeAdvisor`, route `/api/ai/perfume-advisor`, constants `PERFUME_SYSTEM_PROMPT_*` — server↔client contract; only the prompt *content* needs to be abaya.
- `generateProductInsights` JSON keys `scentNotes/longevity/sillage` — server↔client contract; only display labels in ProductInsightsCard remap (scentNotes→أبرز السمات, longevity→جودة القماش, sillage→المقاس والقصّة).
- Misc JS identifiers: `fuji-offline-db`, `fuji:print-error`, `__fujiPrintError`, `fuji-cafe-language`, `fuji-card`/`qahwa-card`.

**Why:** These are internal identifiers, not user-visible. Renaming risks data loss or breaking the server/client contract. Only user-visible strings matter for brand compliance.

## Email sender addresses kept on `myla.sa` (not `myla-ababas.store`)
`info@`/`noreply@myla.sa` senders and internal `${phone}@myla.sa` placeholders are kept intentionally — tied to SMTP2GO domain verification, not the public storefront domain.
