# The mock API

The wallet screens talk to an API through `WalletService`. Which API that is
comes from `environment.apiUrl`, and that is the only place it is decided.

| Build | `apiUrl` | Answered by |
| --- | --- | --- |
| `npm start` | `http://localhost:3000/api/v1/` | Mockoon, or the real backend |
| `npm run build:demo` | `api/v1/` (relative) | Static JSON published with the app |
| `npm run build:prod` | `/api/v1/` | The real backend |

Both stand-ins are generated from **one dataset**, so a developer running
Mockoon locally sees the same figures as the published demo.

```
scripts/wallet-dataset.mjs     the data
scripts/generate-mock-api.mjs  writes both outputs
npm run mock:build             runs the generator
```

## Static JSON, for the demo

The published demo has no server, so `mock-api/` is built into the bundle at
`api/v1/` and the app fetches it over HTTP like any other API — real requests,
visible in DevTools.

Two consequences worth knowing:

- **Files are written without an extension.** The app asks for
  `wallet/balance`, and a static host serves the path exactly as requested;
  `balance.json` would simply 404.
- **Query parameters are ignored.** A static host cannot filter, so the ledger
  returns its whole dataset whatever `from`, `to` or `type` say. The screen
  repeats the filter on what comes back, which is a no-op against a real
  paging, filtering server.
- **Writes cannot be answered.** Adding a payout method or requesting a
  withdrawal will fail in the published demo; run Mockoon to exercise those.

Because a static host cannot serve one path as both a file and a directory,
the withdrawal rules live at `wallet/withdrawal-options` rather than under
`wallet/withdrawals/`.

## Mockoon, for local development

`mockoon/drivoo-wallet-api.json` is a generated Mockoon environment on port
3000 that answers every route, writes included.

```
npx @mockoon/cli start --data mockoon/drivoo-wallet-api.json
npm start
```

## Changing the data

Edit `scripts/wallet-dataset.mjs` and run `npm run mock:build`. The dataset
keeps the figures reconciling: `total = pending + available`, the ledger sums
to `available`, each entry carries the balance after it, and the running
balance never goes negative.
