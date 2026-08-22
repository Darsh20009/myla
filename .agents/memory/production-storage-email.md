---
name: Production storage and email
description: Render requires persistent media storage and the admin email test must match the configured SMTP provider.
---

Production uploads must never silently fall back to local disk, because Render's filesystem is ephemeral and relative upload URLs become broken after redeploys. Email diagnostics must validate the same provider used by the send service; a separate provider check can falsely report valid SMTP as unavailable.

**Why:** A deployment can appear healthy while media disappears after restart, and an unrelated SMTP2GO gate previously hid working cPanel SMTP configuration.

**How to apply:** Keep Cloudinary or object storage configured for production, and keep admin health checks aligned with the active SMTP transport.