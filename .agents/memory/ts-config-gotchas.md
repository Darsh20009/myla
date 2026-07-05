---
name: TypeScript config gotchas
description: Non-obvious TS issues in this project: missing tsconfig target, Mongoose schema as-any pattern, groqChatFor arg order.
---

## tsconfig target was missing

The tsconfig had no `target` field (defaulted to ES3). This broke:
- `for...of` on `Map.prototype.keys()` / `Set` (TS error: "MapIterator can only be iterated with --downlevelIteration or target ≥ ES2015")
- Regex `/u` flag (needs target ≥ ES6)
- Top-level `await` in vite.config.ts (needs target ≥ ES2017)
- `[...new Set(...)]` spread (needs lib `dom.iterable` + target ≥ ES2015)

**Fix applied:** Added `"target": "ES2020"` and `"lib": ["ES2020", "DOM", "DOM.Iterable"]` to tsconfig.json.

**Why:** Without explicit target, TypeScript generates ES3-compatible code and enforces ES3 type constraints, even when lib provides modern type declarations.

**How to apply:** Any new tsconfig should always include an explicit `target`. For this project it's `ES2020`.

---

## Mongoose Schema<T> extra-field suppression

When Mongoose schema bodies include fields NOT in the TypeScript type (e.g., `activationToken` in `userSchema` which isn't in the `User` type), TypeScript TS2353 triggers.

**Wrong approach:** Casting individual field values: `activationToken: { type: String } as any` — TypeScript STILL checks the property name against the target type.

**Correct approach:** Cast the ENTIRE schema body object:
```typescript
const userSchema = new Schema<User>(
  {
    ...
    activationToken: { type: String },  // no per-field cast needed
  } as any,                             // ← whole body cast
  { timestamps: true }
);
```

Affected schemas: `userSchema`, `orderSchema`, `shippingCompanySchema`, `productSchema`.

**Why:** TS2353 "object literal may only specify known properties" fires on the PROPERTY NAMES in the literal, not on the values. The `as any` must wrap the entire object to bypass this check.

---

## groqChatFor argument order

The function signature in `server/groq.ts` is:
```typescript
export async function groqChatFor(
  audience: Audience,  // "customer" | "employee"
  messages: ChatMessage[],
  maxTokens = 1024,
): Promise<string>
```

Several call sites in `server/routes.ts` had the arguments BACKWARDS (messages first, tokens second, audience third). Fixed to put `audience` first.

**How to apply:** Always call as `groqChatFor("employee", [messages], tokens)` or `groqChatFor("customer", [messages], tokens)`.
