# Drivoo Frontend — Reports

Angular 21 dashboard for the Drivoo fulfilment / cash-on-delivery system. This
branch adds the merchant-facing reports.

run : npm run start

## Wallet

`/finance/my-wallet` is the merchant's wallet: what they hold, what moved, and
how to get it out. Three balances sit above three tabs, because each tab asks a
different question about the same money.

| Tab | Shows |
| --- | --- |
| Withdrawals | Each request, the stage it has reached, its fee and what landed |
| Payout methods | Bank account, Vodafone Cash, InstaPay, or cash from a branch |
| Wallet ledger | Every movement in and out, with the balance after each one |

Two things the screen insists on:

- **A blocked withdrawal says why, and what to do.** The reason is a code from
  the server, so the screen can name the open request, the minimum, or the
  missing payout method — and link to whatever fixes it.
- **Nothing loads that nobody asked for.** Each tab body sits in an
  `ng-template matTabContent`, so the ledger fetches its history only when it
  is opened — and then 25 rows at a time. Without that, Material builds all
  three tabs the moment the page opens.

Every list exports to CSV that Excel opens directly, Arabic included.
## Install

```bash
npm install
```

## Running

| Command | Backend | Use it for |
| --- | --- | --- |
| `npm run dev` | Mockoon on `http://localhost:3000` | **Day-to-day development** — mock API and app together |
| `npm run mock` | — | The mock API on its own |
| `npm start` | whatever is on `localhost:3000` | The app on its own |
| `npm run mock:build` | — | Regenerate the mock API after editing the dataset |
| `npm run build:demo` | static files published with the app | The build published to GitHub Pages |
| `npm run build` | `environment.prod.ts` | Production build against the real API |

Sign in with `admin` / `123456789`.

## Reports

`/reports` is a tabbed screen defaulting to the current month; every tab exports
to CSV, which Excel opens directly.

Overview is the period's summary: how many orders reached each status, what they
were worth, and how that moved day to day. The order-by-order detail behind
those totals is a **download** rather than a table — pick a status, or take them
all, for whatever period is selected.

| Tab | Shows |
| --- | --- |
| Overview | Period totals per status, sales, trend and breakdown — plus the detailed order export |
| Shipping | Carrier, city and area — wherever the delivery actually happens |
| Returns | Return reasons, plus returns by product and by area |
| Products | The stock report, then sales and delivery outcome per product |
| Operations | Confirmation funnel, attempts, cancellation reasons and confirmation quality per product |
| Stores | Performance per storefront |

The products table carries two stock columns before the period columns —
pieces received since the product was added, and pieces on the shelf now — and
the product name opens `/reports/product/:id`, that product's stock ledger. The
stock figures are a point in time: they say what is in the warehouse now,
whatever period is selected, and the table says so rather than implying it.

A merchant may use a single carrier, which leaves a carrier-only tab with one
row to compare against nothing. Shipping therefore covers carrier, city and area
together — the three ways of asking where delivery goes wrong.

Every comparison table carries the same columns — orders, shipped, delivered,
returned, delivery success rate, return rate, average days — because a count
alone ranks a busy dimension above a healthy one.

## Where the data comes from

Every screen reads the API through a service; nothing holds data of its own.
`environment.apiUrl` is the single place that decides which API that is.

| Command | API | Purpose |
| --- | --- | --- |
| `npm start` | `http://localhost:3000/api/v1/` | Development, against Mockoon or the real backend |
| `npm run build:demo` | relative `api/v1/` | The build published to GitHub Pages |
| `npm run build:prod` | `/api/v1/` | Production, against the real API |

- `docs/mock-api.md` — how the mock API is generated and served
- `docs/backend-requirements.md` — **fields the real API still needs**, and the
  provisional values standing in for them

## Tests

```
npm run test:ci
```

Note: six specs that shipped with the template (`app.component`,
`dashboard.component`, `list-product.component`) fail on `main` as well — they
declare standalone components in `declarations`, which Angular 21 rejects.
They are unrelated to the wallet and are left alone here.
## Deploying

Pushing to `Reports` or `main` runs `.github/workflows/deploy-demo.yml`, which
publishes to GitHub Pages. This needs Pages enabled once
(**Settings → Pages → Source: GitHub Actions**) and the branch allowed under
**Settings → Environments → github-pages → Deployment branches**.

## API surface

Base URL comes from `environment.apiUrl`; Mockoon serves everything under
`api/v1/`.

```
GET  reports/summary
GET  reports/orders-over-time
GET  reports/status-breakdown
GET  reports/returns-by-reason
GET  reports/confirmation-funnel
GET  reports/cancellation-reasons
GET  reports/confirmation-by-product
GET  reports/inventory
GET  reports/inventory-movements/{product_id}
GET  reports/orders                 paged: page, limit, status, search
                                    (backs the detailed export)
GET  reports/performance/{carrier|city|area|product|store}
POST user/login
POST auth/refresh
```

All reports endpoints accept `from` and `to` (`YYYY-MM-DD`) and an optional
`city_id`. Response shapes are typed in
`src/app/services/api/reports.service.ts`.
