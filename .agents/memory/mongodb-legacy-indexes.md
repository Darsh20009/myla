---
name: MongoDB legacy id_1 indexes
description: 40+ MongoDB collections inherited a unique id_1 index from previous multi-tenant system. Any new document insert fails with E11000 dup key id: null.
---

# MongoDB Legacy Unique id_1 Index Problem

## The Rule
After migrating from the old system (Qirox/multi-tenant), the MongoDB database has a `unique` index named `id_1` on 40+ collections. Since the current schema does not define an `id` field (Mongoose uses virtual `id` from `_id`), every new document gets `id: null` and the second insert collides.

**Why:** The old system had an explicit `id` field with a unique index on each collection. The current codebase dropped that field but the indexes remain in the live Atlas database.

**How to apply:** If any create operation returns `E11000 duplicate key error ... index: id_1 dup key: { id: null }`, drop the `id_1` index from that collection:
```js
await db.collection('collectionname').dropIndex('id_1');
```

This was done in bulk for all 41 affected collections on 2026-06-09. Should not recur unless the app is connected to a fresh Atlas cluster that was restored from an old backup.

## Affected Collections (fixed 2026-06-09)
auditlogs, invoices, appointments, paymentrecords, deliverydrivers, productaddons, costcenters, managernotifications, deliveryzones, employeeshiftassignments, tenants, promooffers, taxrates, deliveryorders, wastages, apimetrics, employeeviolations, webhookdeliveries, accounts, shifts, queuejobs, payrollsnapshots, ecosystemintegrations, bankstatements, coffeeitems, employeebreaks, menucategories, webhooks, banktransactions, deliveryintegrations, caves, custombanners, journalentries, refundorders, apikeys, warehouses, expenseerps, employeetasks, crashsessions, employees, productions, vendors
