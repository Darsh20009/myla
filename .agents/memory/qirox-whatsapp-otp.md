---
name: Qirox WhatsApp OTP
description: Provider choice and deployment configuration for customer verification messages.
---

Qirox is the selected WhatsApp OTP sender. Its message endpoint is POST-only, and the sender credential must be configured separately in Replit and Render; one environment does not populate the other.

**Why:** Opening the send endpoint with GET produces “Cannot GET” by design, while live delivery depends on a configured credential and a real recipient.

**How to apply:** Keep credentials in each platform's secret manager, never in source or chat. Validate delivery only with explicit consent and an actual test destination; do not invent a GET health check for a send-only endpoint.