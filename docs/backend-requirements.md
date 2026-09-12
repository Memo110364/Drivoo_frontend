# Backend requirements — reports

Every field listed here is **not available in the current API**. The reports
screens are built against the contract below and read these fields as-is; the
demo data that fills them is provisional and carries no business logic, so
nothing needs rewriting when the real API arrives — only the values change.

Provisional data lives in `scripts/mock-dataset.mjs` and nowhere else. No
component or service derives a metric from a field that does not exist.

---

## 1. Carrier — blocks the whole Shipping tab

The shipping report compares carriers, and no order currently carries one.

| Field | Type | Notes |
| --- | --- | --- |
| `carrier.id` | string | Stable identifier |
| `carrier.name` | string | Display name |

Needed on the order, so results can be grouped by carrier over a date range.

**Provisional values:** `سريع إكسبرس`, `كارجو النيل`, `دلتا لوجيستكس` — invented
names, not real companies, chosen only so the tab reads naturally in a demo.
Replace with the real carrier list; do not read anything into them.

Their figures differ on purpose: the carrier with the most orders has the
second-best success rate, which is the point the tab exists to make.

---

## 2. Return reason — blocks the Returns tab

Confirmed as existing in the real backend, but its field name and value set are
not yet known, so the frontend currently reads a provisional enum.

| Field | Type | Notes |
| --- | --- | --- |
| `return_reason` | string (enum code) | One code per returned order |

**Provisional codes** — the UI translates each code, so wording can change
freely, but the codes themselves must match:

| Code | Arabic label used today |
| --- | --- |
| `customer_refused` | العميل رفض الاستلام |
| `unreachable` | تعذر الوصول للعميل |
| `postponed_expired` | تأجيل متكرر حتى انتهت المهلة |
| `wrong_address` | عنوان غير صحيح |
| `item_mismatch` | المنتج مخالف للطلب |
| `damaged` | المنتج تالف |
| `other` | أخرى |

**Action:** send the real field name and code list; only
`scripts/mock-dataset.mjs` and the i18n labels change.

---

## 3. Settlements — blocks the Finance tab (not built yet)

Settlements arrive from the shipping company, are uploaded to the system, and
are applied to the merchant for orders that reached a final state (delivered or
returned). Frequency follows the merchant's contract — typically two or three
times a week.

Nothing in the current API exposes any of this, so the Finance tab is **not
built**. It needs, per settlement:

| Field | Type | Notes |
| --- | --- | --- |
| `id` / `reference` | string | Settlement identifier |
| `date` | date | When it was applied |
| `period_from` / `period_to` | date | Orders covered |
| `orders_count` | number | Orders included |
| `cod_collected` | number | Cash collected |
| `shipping_fees` | number | Deducted |
| `commission` | number | Deducted |
| `returns_cost` | number | Deducted |
| `net_payable` | number | Paid to the merchant |
| `status` | enum | e.g. `pending` / `paid` |

---

## 4. Stock — piece counts and movement history

The catalogue already carries **`stock`** (pieces on the shelf now),
**`warning_stock_number`** (that product's own low threshold) and **`depot`**.
Those three are real, and the Products tab uses them as they are. Everything
else on the stock side is missing.

### 4a. Stock counted in pieces, not orders

Every reports endpoint today counts **orders**. Stock is counted in **pieces**,
and one order can carry several. So a column reading "sold 277" next to one
reading "in stock 320" is comparing two different units — which is exactly the
kind of comparison a stock report exists to make.

The demo bridges the two with an invented pieces-per-order factor. That factor
is a demo assumption and nothing else: **it must not survive into production.**
The API has to return the piece counts directly.

```
GET reports/inventory
  -> { total_products, total_received, total_units,
       units_in_transit, units_sold,
       in_stock, low_stock, out_of_stock }
```

| Field | Unit | Status |
| --- | --- | --- |
| `total_products` | products | Derivable — count the catalogue |
| `total_received` | pieces | **Missing** — needs the intake ledger in 4b |
| `total_units` | pieces | Derivable — sum of `stock` |
| `units_in_transit` | pieces | **Missing** — pieces on shipped-but-unsettled orders |
| `units_sold` | pieces | **Missing** — pieces on delivered orders |
| `in_stock` / `low_stock` / `out_of_stock` | products | Derivable from `stock` vs `warning_stock_number` |

Two invariants the frontend relies on, and the demo data is built to satisfy:

```
total_received = total_units + units_in_transit + units_sold
in_stock + low_stock + out_of_stock = total_products
```

The same two piece counts are needed per product, since the products table
shows them per row:

```
GET reports/performance/product
  -> data: [{ …, total_stock, current_stock, warning_stock_number }]
```

`current_stock` and `warning_stock_number` map onto fields that exist.
`total_stock` — pieces received since the product was added — does not.

Both stock columns are **point in time**: they say what is in the warehouse
now, whatever period is selected. The screen states that rather than implying
it, and the API should not accept `from`/`to` on them.

### 4b. The movement ledger

Current stock exists; its history does not. Without it there is no answer to
"where did this product's stock go", and stock coverage ("how many days of
stock is left at the current rate") and turnover cannot be computed either.

```
GET reports/inventory-movements/{product_id}
  -> { product: { id, label, current_stock, total_stock,
                  units_in_transit, units_sold, warning_stock_number },
       data: [{ date, type, quantity, balance, reference }] }
```

| Field | Notes |
| --- | --- |
| `type` | Stable enum — the UI translates it, so it must not be free text |
| `quantity` | Pieces, signed: positive onto the shelf, negative off it |
| `balance` | Running balance after this movement |
| `reference` | The purchase order, shipment or return it belongs to |

Provisional `type` values, standing in until the real ones arrive:

| Provisional code | Meaning |
| --- | --- |
| `inbound` | Received into the warehouse |
| `outbound_shipment` | Left with a shipment |
| `return_in` | A refused delivery came back onto the shelf |

The ledger is **not period-filtered**, deliberately: a running balance only
means anything read from the first movement onwards. Slicing it to a month
would show a balance that starts mid-air. If the history ever grows long enough
to need paging, page it from the newest end and carry the opening balance in
the response — do not filter it by date.

Two invariants, again satisfied by the demo data:

```
sum(quantity)                     = current_stock
sum(quantity where type=inbound)  = total_stock
```

and the running balance must never go negative — a warehouse cannot ship pieces
it has not received.

**This whole endpoint is invented shape, not invented policy.** It exists to
pin down the contract the drill-down page needs; the real ledger replaces it
wholesale, and whatever movement types the warehouse actually records should
replace the three above.

---

## 5. Status transition timestamps

Per-stage SLA — how long an order sits at each status — needs a timestamp per
transition. Only the current status is exposed today, so no stage timing is
reported.

---

## 6. Store dimension — confirmed

A merchant can run more than one storefront, so the Stores tab compares them and
stays.

`store` identifies the storefront itself, **not** a traffic source, so no
acquisition-channel report can be built from it. Any question of the form "which
channel should I spend on" needs a field that does not exist yet.

The field is already on the order, so this tab needs nothing new from the
backend — only real values in place of the provisional store names.

---

## 7. Orders detail endpoint

`GET reports/orders` lists every order in the period. It backs a **download**,
not a table — the screen answers "how did the period go", this answers "which
orders exactly", which is a spreadsheet job. It is still paged on the server so
the endpoint stays usable if a screen ever needs it; the export passes a high
`limit` to pull the whole filtered period in one request.

```
GET reports/orders?from&to&page&limit&status&search
  -> { page, limit, total, data: OrderRow[] }
```

| Parameter | Notes |
| --- | --- |
| `status` | One of the six groups, or absent for every status |
| `search` | Matches order code, customer name or phone |
| `limit` | Export passes `limit = total` to pull the whole filtered set |

Each row carries `order_code`, `date`, customer name and phone, city and area,
store, carrier, item count, `status` (the group) **and** `status_code` (the
backend's own numeric status, so a row can be traced back), goods total,
shipping cost and the total the customer pays.

Every field already exists on the order except `carrier`, covered in section 1.

**Note on the demo:** the static host ignores every query parameter, so the
downloaded file covers the whole demo dataset regardless of the period or status
chosen. Against the real API both are honoured.

## 8. Cancellation reason — separate from return reason

The Operations tab shows why orders were cancelled **before** they ever shipped.
That is a different question from section 2: a return reason explains a delivery
that was attempted and refused, a cancellation reason explains an order that
never left the warehouse. One field cannot answer both, so this is a second
field, not a reuse.

```
GET reports/cancellation-reasons -> { data: [{ code, count }] }
```

`code` must be a stable enum, not free text, or the chart cannot group. The
provisional values standing in until the real ones arrive:

| Provisional code | Meaning |
| --- | --- |
| `unreachable` | The confirmation calls never got an answer |
| `customer_changed_mind` | Reached, and no longer wanted it |
| `price_objection` | Reached, and objected to the price |
| `duplicate_order` | The same customer ordered twice |
| `wrong_number` | The phone number was not the customer's |
| `out_of_stock` | The item could not be fulfilled |
| `other` | Anything the list above does not cover |

If the backend has no such field, cancellations can still be counted — the
reasons chart is the part that is blocked, and it is the part a merchant acts
on.

---

## 9. Confirmation outcome per product

The confirmation funnel already exists for the account as a whole. Splitting it
by product is what makes it actionable: a merchant can stop stocking a product
whose orders keep dying on the confirmation call, but only once they can see
which product that is.

```
GET reports/confirmation-by-product
  -> { data: [{ id, label, placed, confirmed, lost, confirmation_rate, avg_attempts }] }
```

Every field is derivable from data the backend already holds — orders carry a
product and a confirmation outcome — so this is an aggregation to write, not a
field to add. It is listed here because the aggregation does not exist yet.

`lost = placed - confirmed`, and `confirmation_rate = confirmed / placed * 100`.
The API returns the rate rather than leaving the frontend to divide, for the
same reason as the delivery rates below.

---

## Metrics and their formulas

Both rates share one denominator — orders whose delivery outcome is final. An
order still in transit has no outcome yet, and one cancelled before shipping
never reached a delivery attempt, so neither belongs in it. The two therefore
sum to 100%.

```
delivery_success_rate = delivered / (delivered + returned) * 100
return_rate           = returned  / (delivered + returned) * 100
```

The API returns both rates alongside the counts rather than leaving the
frontend to divide, so backend and frontend cannot disagree on a denominator.
