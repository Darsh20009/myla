---
name: Check prior context first
description: Avoid repeating user intake for catalog, brand, and shipping details already available in this project.
---

Before asking for catalog, shipping, or brand information, inspect earlier conversation, uploaded project assets, the existing storefront/API, and current integrations/settings. Ask only for information that is truly missing, state what has already been found, and do not ask the user to re-enter details already supplied.

For carrier setup, distinguish operational details (carrier choice, sender address, service types) from authentication secrets. Verify the exact secret names the runtime reads, and explain when supplied details were not transferred into runtime secrets; do not frame that gap as the user failing to provide information.

**Why:** On 2026-10-06 the user corrected a repeated request and said they had already provided the information.

**How to apply:** For Myla catalog and shipping work, search the current project state and existing data sources first. Keep any remaining question narrowly scoped, such as asking for a specific admin task only when no example is recoverable.
