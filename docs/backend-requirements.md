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
