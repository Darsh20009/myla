---
name: Admin bootstrap credentials
description: Safe startup and rotation behavior for the bootstrap administrator account.
---

If the bootstrap administrator already exists, a missing bootstrap secret must not prevent the application from starting or alter that account's stored credentials. A configured secret is an explicit create-or-rotate operation; first-time setup still requires a sufficiently strong secret.

**Why:** Requiring the secret on every boot caused service startup to fail when it was absent, while silently applying a default or changing the password would risk administrator access. Preserving the existing credential keeps startup available without an unapproved password change.

**How to apply:** When changing startup or seeding behavior, preserve the existing administrator when the secret is absent, require a strong secret only when creating the first bootstrap administrator, and treat a configured secret as an intentional password rotation.