# Modernize-Angular-pro
Modernize Angular Admin Dashboard

install : npm install

run : npm run start

## Wallet

`/finance/my-wallet` is the merchant's wallet: what they hold, what moved, and
how to get it out. Three balances sit above three tabs, because each tab asks a
different question about the same money.

| Tab | Shows |
| --- | --- |
| Wallet ledger | Every movement in and out, with the balance after each one |
| Withdrawals | Each request, the stage it has reached, its fee and what landed |
| Payout methods | Bank account, Vodafone Cash, InstaPay, or cash from a branch |

Two things the screen insists on:

- **The pending balance says when it arrives.** A figure with no date attached
  is the merchant's first question left unanswered.
- **A blocked withdrawal says why, and what to do.** The reason is a code from
  the server, so the screen can name the open request, the minimum, or the
  missing payout method — and link to whatever fixes it.

Every list exports to CSV that Excel opens directly, Arabic included.

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
