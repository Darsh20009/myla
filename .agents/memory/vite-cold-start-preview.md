---
name: Vite cold-start preview
description: A transient browser error observed while Vite was optimizing dependencies after import.
---

On the first preview immediately after starting the imported app, a lazy component showed an invalid React hook call and the runtime overlay. The workflow subsequently logged that Vite optimized new dependencies and reloaded; a fresh screenshot loaded the splash screen without the hook error.

**Why:** The error appeared during Vite's initial dependency-optimization cycle, not as a repeatable defect in the component. Editing the component based only on the first screenshot would have introduced unnecessary changes.

**How to apply:** When a cold preview reports a hook failure alongside ongoing Vite optimization, wait for dependency optimization to settle and load the page afresh. Only investigate code if the error persists after that.