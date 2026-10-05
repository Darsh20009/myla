---
name: Admin login methods
description: Product requirement for administrator authentication choices.
---

Administrators must be able to choose either password login or WhatsApp OTP. Other staff roles remain password-only.

**Why:** The user explicitly requested an alternative to OTP-only administrator login.

**How to apply:** Keep the role checks, OTP API policy, and every login entry point aligned so admin can use either method while non-admin staff cannot use OTP.
