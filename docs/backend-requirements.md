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

## 4. Historical inventory movements

Current stock is available; its history is not. Stock coverage ("how many days
of stock is left at the current rate") and turnover cannot be computed without
it, so neither is shown.

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

`GET reports/orders` lists every order in the period. Unlike the comparison
endpoints it is **paged on the server**, because a busy merchant's month runs to
thousands of rows.

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

**Note on the demo:** the static host ignores `limit`, so the table renders at
most one page itself rather than trusting the response length. Against a real
paging server that slice is a no-op.

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
