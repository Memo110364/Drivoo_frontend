# Drivoo Frontend — Reports

Angular 21 dashboard for the Drivoo fulfilment / cash-on-delivery system. This
branch adds the merchant-facing reports.

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
| Products | Stock on hand, then sales and delivery outcome per product |
| Operations | Confirmation funnel, attempts, cancellation reasons and confirmation quality per product |
| Stores | Performance per storefront |

A merchant may use a single carrier, which leaves a carrier-only tab with one
row to compare against nothing. Shipping therefore covers carrier, city and area
together — the three ways of asking where delivery goes wrong.

Every comparison table carries the same columns — orders, shipped, delivered,
returned, delivery success rate, return rate, average days — because a count
alone ranks a busy dimension above a healthy one.

## Where the data comes from

Every screen reads the API through a service; nothing holds data of its own.
`environment.apiUrl` is the single place that decides which API that is.

- `docs/mock-api.md` — how the mock API is generated and served
- `docs/backend-requirements.md` — **fields the real API still needs**, and the
  provisional values standing in for them

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
GET  reports/orders                 paged: page, limit, status, search
                                    (backs the detailed export)
GET  reports/performance/{carrier|city|area|product|store}
POST user/login
POST auth/refresh
```

All reports endpoints accept `from` and `to` (`YYYY-MM-DD`) and an optional
`city_id`. Response shapes are typed in
`src/app/services/api/reports.service.ts`.
