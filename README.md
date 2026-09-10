# Drivoo Frontend

Angular 21 dashboard for the Drivoo shipping / cash-on-delivery system.

## Install

```bash
npm install
```

## Running

The app reads its backend configuration from `src/environments/`. Pick the mode
that matches what you have running:

| Command | Backend | Use it for |
| --- | --- | --- |
| `npm start` | Mockoon on `http://localhost:3000` | Day-to-day development against the test data |
| `npm run start:demo` | In-app mock backend (no server) | Previewing the UI with nothing else running |
| `npm run build` | `environment.prod.ts` | Production build against the real API |
| `npm run build:demo` | In-app mock backend | The build published to GitHub Pages / Netlify |

### Development against Mockoon

Open the `Moyaser` environment in [Mockoon](https://mockoon.com) and start it on
port 3000, then run `npm start`. Sign in with `admin` / `123456789`.

### Demo mode

`src/app/mock/` contains a mock backend that answers the same routes Mockoon
serves, plus the `reports/*` routes the reports screen needs. It is switched on
by `useMockApi` in `src/environments/environment.demo.ts` and is completely
inert in every other configuration, so it never affects real builds.

## Deploying

Pushing to `Mahmoud` (the working branch) or `main` runs
`.github/workflows/deploy-demo.yml`, which builds the demo configuration and
publishes it to GitHub Pages. This needs GitHub Pages to
be enabled once: **Settings → Pages → Source: GitHub Actions**. The workflow can
also be started by hand from the **Actions** tab (`Run workflow`).

`netlify.toml` configures the same demo build for Netlify.

## API surface

Base URL comes from `environment.apiUrl` (Mockoon serves everything under
`api/v1/`).

```
POST   user/login                                 auth
POST   auth/refresh
GET    dashboard                                  dashboard cards
GET    reports/dashboard/orders-status
GET    reports/dashboard/orders-last-thirty-days
GET    reports/summary                            reports screen
GET    reports/orders-over-time
GET    reports/status-breakdown
GET    reports/top-products
GET    reports/cities-performance
GET    logistics/cities                           cities + areas
GET    orders                                     list, paged and filtered
GET    orders/count-by-status
GET    orders/:id     POST orders   PUT orders/:id   DELETE orders/:id
GET    products/list                              catalogue, paged and filtered
GET    products/count-by-status
GET    products/:id   POST products  PUT products/:id  DELETE products/:id
```

Every `reports/*` endpoint accepts `from`, `to` (`YYYY-MM-DD`), and optional
`city_id` and `status_group` (`pending | shipped | delivered | failed`). The
exact response shapes are typed in `src/app/services/api/reports.service.ts` and
implemented in `src/app/mock/mock-reports.ts`.
