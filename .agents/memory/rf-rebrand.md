---
name: RF Perfume rebrand (from Myla)
description: Brand identity values and decisions for the رفيف العود / RF Perfume rebrand that replaced the earlier Myla branding.
---

# RF Perfume Rebrand

The codebase was rebranded Fuji Cafe → Myla → **RF Perfume / رفيف العود**. Canonical brand identity values now used across code:

- **English brand:** `RF Perfume`
- **Arabic brand:** `رفيف العود`
- **Domain:** `rfperfume.sa` (consolidated — the old code had two domains, `myla.sa` and `myla-abayas.store`, both now point at `rfperfume.sa`)
- **Social handle:** `rfperfume` (instagram.com/rfperfume, tiktok.com/@rfperfume, snapchat.com/add/rfperfume, x.com/rfperfume)
- **Emails:** `info@rfperfume.sa`, `noreply@rfperfume.sa`, `support@rfperfume.sa`
- **Logo file:** `client/public/rf-logo.png` (was `myla-logo.png`)
- **Splash video:** `client/public/rf-splash.mov` (was `myla-splash.mov`)

## Replacement gotchas (if rebranding again)
- English `Myla` is never a code identifier — safe to replace globally as a value.
- Arabic `ميلا` is a SUBSTRING of unrelated words (`عميلاً` customer, `الميلاد` birthday, `الإيميلات` emails). Replacing it requires Arabic word boundaries — use perl with `use utf8` and negative look-around `(?<![\x{0621}-\x{064A}])ميلا(?![\x{0621}-\x{064A}])`. Without `use utf8` the literal Arabic pattern won't match decoded input.

## Intentionally NOT changed (out of brand-string scope)
- Internal localStorage keys: `myla_prep_auth`, `myla_auto_print`, `myla_prep_sound`, `myla_sound_enabled` (changing them just resets user prefs; kept like the legacy `fuji-*` identifiers).
- `mylaLogoPath` import var in `Home.tsx` (points at an attached_assets screenshot, not the logo png).
- **Logo/splash ARTWORK still visually depicts "Myla / Abayas by HMBL"** — only filenames/references were updated; no RF Perfume artwork was provided. The hero on Home.tsx and rf-logo.png/rf-splash.mov pixels still say Myla until real artwork is supplied.
- Product-category content (`عبايات`/abayas, leftover coffee copy in `use-language.ts`) was left for the separate content-cleanup task.
- DB `storesettings` doc holds owner-set `storeName: "Myla"`, `storeEmail: "info@myla.sa"`, `bankAccountHolder: "Myla"` — runtime/admin-editable data, not hardcoded; `server/seed.ts` now seeds RF values for fresh installs.
