# Inventory module — scope (Phase 2 / separate epic)

Inventory is **not** modeled in the current ERP schema or API surface. Treat it as a **separate epic** before implementation.

## Out of scope today

- No `inventory` tables, stock movements, warehouses, or SKU master in the backend.
- No finance or PM coupling for stock valuation in the current codebase.

## When picked up, clarify first

1. **Domain**: retail stock, manufacturing WIP, or internal asset tracking.
2. **Stock model**: weighted average vs FIFO; negative stock allowed or not.
3. **Integrations**: whether goods receipts tie to **AP** / purchase orders and whether issues tie to **projects** (PM).

## Suggested milestones (reference only)

1. Master data: item, unit, warehouse, optional barcode.
2. Transactions: receipt, issue, transfer, adjustment; immutable ledger + current quantity view.
3. Permissions: e.g. `inventory:item:view`, `inventory:stock:adjust`, aligned with existing `module:resource:action` patterns.
4. Frontend: list/detail forms and low-stock reporting after APIs exist.

Until then, product and engineering should not assume inventory fields in HR, finance, or PM modules.
