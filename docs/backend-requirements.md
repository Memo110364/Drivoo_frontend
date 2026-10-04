# Backend requirements — wallet

The wallet screens read everything from the API; nothing is computed or
invented in the frontend. Where the backend does not expose something yet, it
is written down here rather than given demo logic that would quietly survive
into production.

Values marked **PROVISIONAL** are placeholders in the demo dataset
(`scripts/wallet-dataset.mjs`) and have to be replaced by the real contract.

---

## 1. When the pending balance is released — not built

`GET wallet/balance` returns three figures, and `total = pending + available`
holds today:

```
{ currency, total, pending, available }
```

A release schedule — which delivered orders settle on which date, and for how
much — would answer the merchant's obvious next question. It is **not built**,
because the carrier settlement cycle is not exposed, and a date on a money
screen that was invented is worse than no date at all.

If the cycle can be resolved per order, the field to add is:

```
pending_releases: [{ date, amount, orders }]
```

Even a single next-settlement date would do, provided the amount is real.

---

## 2. The ledger — both directions, with a running balance

```
GET wallet/ledger?from&to&type&page&limit
  -> { page, limit, total, data: LedgerEntry[] }
```

Each entry:

| Field | Notes |
| --- | --- |
| `date` | ISO timestamp |
| `type` | Stable enum, translated by the UI — never a sentence |
| `amount` | Signed: positive into the wallet, negative out of it |
| `balance` | Running balance **after** this entry |
| `reference` | Order code, invoice number or withdrawal code |
| `reference_type` | `order`, `invoice`, `withdrawal`, or empty |

Three things the old screen got wrong, and what they require:

1. **The reference was buried in a sentence** — `Increase your balance ( order
   price No. BHK3359755 )`. It has to be its own field, or it cannot be
   searched, sorted or filtered.
2. **There was no running balance**, so the account could not be reconciled
   against the balance card. `balance` has to come from the backend, not be
   accumulated in the frontend — a filtered or paged response would then
   compute a balance that starts mid-air.
3. **Only credits appeared.** Withdrawals, shipping fees and return shipping
   all move the wallet, so all of them belong in the ledger. If they are
   missing, the ledger cannot add up to the balance.

Filtering by `from`, `to` and `type` has to be done server-side; the screen
repeats it on what comes back only so the static demo behaves.

### Movement types

Drivoo bills the merchant for more than shipping, and every charge moves the
wallet, so every one belongs on the ledger:

| `type` | Direction |
| --- | --- |
| `order_payout` | In — a delivered order's goods value |
| `withdrawal` | Out — held the moment the request is made |
| `shipping_fee` | Out |
| `return_shipping` | Out |
| `confirmation_fee` | Out |
| `packaging_fee` | Out — custom packaging |
| `storage_fee` | Out |
| `other_service` | **Either** — a charge, or a credit back |
| `opening_balance` | In — the starting point, not a movement |

`other_service` going both ways is why **the direction has to live on the
amount's sign, not on the type**. Nothing on the screen special-cases it.

**PROVISIONAL:** every code above. Whatever the ledger actually records
replaces them, but the signed-amount rule should survive.

### Paging

The ledger is the one list that grows without limit, so the screen asks for 25
at a time and `total` drives the paginator. It is also the only tab that is not
loaded when the wallet opens — nothing should fetch a merchant's whole history
because they came to check a withdrawal.

The export is separate and deliberately unpaged: it asks for the filtered
period with a high `limit`, because a merchant asking for their statement means
all of it.

---

## 3. Withdrawal rules — read, never hardcoded

```
GET wallet/withdrawal-options -> { rules, eligibility }
```

```
rules: { minimum_amount, maximum_amount, fees: { <method_type>: number },
         allow_concurrent_requests, transfer_days, expected_days }
```

These are business rules, so they belong to the backend. If the frontend
hardcodes a minimum or a fee, the screen and the server will eventually
disagree about whether a request is allowed — and the merchant finds out after
submitting.

`fees` is keyed by payment method type because the cost differs by
destination: a bank transfer is not priced like an InstaPay push.

**PROVISIONAL:** every value. Minimum 500, bank 15 / Vodafone Cash 10 /
InstaPay 0 / cash 0, one open request at a time, transfers on Sunday, Tuesday
and Thursday, arriving in 2 working days.

---

## 4. Eligibility — a refusal has to say why

```
eligibility: { can_request, reason, context, available, next_transfer_date }
```

The old screen said **"you can't request a money"** and stopped. The merchant
had 25,250 available and no way to know what was wrong.

`reason` must be a **code**, not a sentence, so the UI can translate it and
offer the way out. `context` carries the numbers the message needs, so no
figure is baked into a translated string.

| `reason` | What the screen then says |
| --- | --- |
| `request_in_progress` | Names the open request's code and amount |
| `below_minimum` | Names the minimum and the current available balance |
| `no_payment_method` | Points at the payout methods tab |

If the backend has other refusal cases — a frozen account, a failed
verification, a settlement window — each needs its own code. A generic refusal
is the flaw this replaces.

---

## 5. Withdrawal requests — stages, fee and net

```
GET  wallet/withdrawals -> { page, limit, total, data: WithdrawalRequest[] }
POST wallet/withdrawals { amount, payment_method_id } -> { message, code }
```

| Field | Notes |
| --- | --- |
| `amount` | What leaves the wallet |
| `fee` | The transfer fee for that destination |
| `net_amount` | What actually lands — returned, not computed in the frontend |
| `status` | `submitted`, `under_review`, `transferring`, `completed`, `rejected` |
| `timeline` | `[{ stage, at }]` — one entry per stage reached |
| `expected_at` | When the money should land, while it is still moving |
| `rejection_reason` | Required whenever `status` is `rejected` |

A single "Success" pill says nothing while a transfer is in flight, and nothing
at all about why a rejected one was rejected. `timeline` is what lets the
screen show where the money has got to.

**The amount is held when the request is made**, which is why it leaves the
available balance immediately and appears in the ledger as a `withdrawal` —
otherwise the same money could be requested twice.

**PROVISIONAL:** `rejection_reason` is free text in the demo. It should be an
enum plus optional detail, so rejections can be counted and translated.

---

## 6. Payout methods — four types

```
GET    wallet/payment-methods            -> { data: PaymentMethod[] }
POST   wallet/payment-methods            -> { message }
DELETE wallet/payment-methods/{id}       -> { message }
PUT    wallet/payment-methods/{id}/default -> { message }
```

| Field | Notes |
| --- | --- |
| `type` | `bank_account`, `vodafone_cash`, `instapay`, `cash` |
| `label` | Account holder, wallet owner, IPA address, or the branch for cash |
| `masked_identifier` | **Last few characters only** |
| `details` | Type-specific extras: bank name, branch, address |
| `is_default` | The destination a withdrawal defaults to |
| `status` | `active`, `pending_verification`, `disabled` |

Two requirements worth stating plainly:

- **The full account number must never be returned to the browser.** The old
  screen printed `5078034905759382` in full. The merchant only needs enough to
  tell two accounts apart, so the API should send the mask and keep the number.
- **`status` has to be real.** A method that cannot receive a transfer has to
  say so on the card, or a withdrawal gets sent to it and fails later.

The POST payload differs by type, and carries only that type's fields:

| Type | Fields |
| --- | --- |
| `bank_account` | `holder_name`, `bank_name`, `account_number`, `branch` |
| `vodafone_cash` | `holder_name`, `phone` |
| `instapay` | `holder_name`, `instapay_address` |
| `cash` | `holder_name`, `branch_id` |

The frontend validates shape only — an Egyptian mobile is 11 digits opening
010, 011, 012 or 015; an InstaPay address is an IPA handle or a mobile number.
The server is the authority and its answer wins.

---

## 7. Cash collection branches

```
GET wallet/cash-branches -> { data: [{ id, label, address, hours }] }
```

Cash is collected from a Drivoo branch, so the merchant has to be told which
branch, where it is and when it opens — a payout method that says only "cash"
does not tell them where to go.

**PROVISIONAL:** three invented branches. The real list, and whether a
collection needs a reference or code to hand over at the counter, has to come
from the backend.

---

## 8. Not built yet

**Invoices.** `/finance/my-invoices` is in the sidebar and has no screen. The
ledger already references invoice numbers (`INV-2026-07`) for shipping fees, so
the two connect — an invoice row should open the invoice. Left for the next
change, deliberately, rather than built on a guessed shape.
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

---

## Dashboard endpoints

The dashboard asks a different question from the reports screen — "how is the
business doing right now, against last period" rather than "compare these
dimensions within one period" — so it has its own summary rather than
overloading `ReportSummary`. Forcing one type to serve both would have made
half its fields optional and meaningless on each screen.

```
GET reports/dashboard/summary?from&to      -> DashboardSummary
GET reports/dashboard/orders-aging?from&to -> { total, data: [{ bucket, count }] }
GET reports/dashboard/attention?from&to    -> { data: [{ key, count, severity, route }] }
GET reports/dashboard/inventory            -> { total_products, in_stock, low_stock, out_of_stock }
GET reports/top-products?from&to&limit     -> { data: TopProduct[] }
```

### `trends` — the only genuinely missing piece

`DashboardSummary.trends` compares each figure against **the preceding period
of equal length**. Counts and amounts are percentages; rates are already
percentages, so their trend is in points. The backend has to compute it — the
frontend only ever sees one period, so it cannot.

**PROVISIONAL:** the trend values in the demo are placeholders.

### Orders aging needs status timestamps

`reports/dashboard/orders-aging` buckets still-open orders by how long they
have been waiting (`0_2`, `3_5`, `6_7`, `over_7`). That needs a timestamp per
status transition; only the current status is exposed today, so the buckets are
**PROVISIONAL**.

### Attention items are the backend's call

`key`, `severity` and `route` all come from the server so the dashboard cannot
disagree with the screen each alert leads to. Adding a new kind of alert should
not require a frontend change — only a new `key` and its translation.

### Status breakdown carries its own percentages

Each slice returns `percentage` alongside `count`, for the same reason the
delivery rates do: the screen and the server must not divide differently. The
six groups are `pending`, `confirmed`, `in_shipping`, `delivered`, `returned`,
`cancelled`, and they sum to `total`.

---

## Password reset — blocks the forgot-password screen

The screen at `/authentication/forgot-password` is built and posts what the
backend will need. The endpoint does not exist yet.

```
POST auth/forgot-password { identifier } -> 200
```

`identifier` is a mobile number or an email — the same field the sign-in form
takes.

Requirements:

- **Answer the same way whether or not the account exists.** Returning "no such
  account" turns the form into a way of discovering which phone numbers are
  registered. The screen already treats a 404 as success for this reason, but
  the backend should not distinguish them in the first place.
- **Rate-limit it,** and return `429` when the limit is hit — the screen has a
  message for that case.
- The reset link itself needs an expiry; the screen tells the merchant one
  hour, so either honour that or tell the frontend what to say.

A second endpoint is needed to complete the flow, and no screen is built for it
yet because its shape is unknown:

```
POST auth/reset-password { token, new_password } -> 200
```

## Sign-in accepts a mobile number as well as an email

`POST /user/login` takes `{ username, password }`, and
`docs/API_DOCUMENTATION.md` shows an email in that field. Merchants here are
more likely to know their mobile number, so the sign-in form accepts **either**
and sends whichever was typed as `username`.

The backend has to resolve both in that field. If it cannot, the form needs to
know which one to insist on.
