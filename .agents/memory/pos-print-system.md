---
name: POS print system
description: Two-layer print system. print-utils.ts is the ZATCA-compliant HTML receipt generator; thermal-printer.ts is the hardware ESC/POS driver. Both must coexist.
---

# POS Print System Architecture

## Layers
1. **`client/src/lib/print-utils.ts`** — High-level ZATCA-compliant receipt HTML generator for Fuji Cafe. Exports `printTaxInvoice()` and `prewarmZatcaQr()`. Fuji Cafe branding: VAT# 312650651100003, CR# 7042488606.
2. **`client/src/lib/thermal-printer.ts`** — Low-level WebUSB/Network/Bluetooth ESC/POS hardware driver. Exports `PrinterSettings`, `loadPrinterSettings`, `savePrinterSettings`, `openCashDrawer`, `autoPrintOrder`.
3. **`client/src/components/PrinterSettingsPanel.tsx`** — Admin UI for configuring the thermal printer.

## Key Issue Fixed
`PrinterSettings` interface used `cashDrawerEnabled` internally but the settings panel UI used `openCashDrawer`. Fixed by adding `openCashDrawer?: boolean` as an alias to the interface and updating the logic to check `cashDrawerEnabled || openCashDrawer`.

**Why:** The settings panel was adapted from a reference that used different field names.

## POS Usage
In `POS.tsx`, `handlePrintReceipt` dynamically imports `print-utils.ts` and calls `printTaxInvoice()` with a try/catch fallback to a basic `window.open` receipt.
