# The mock API

One dataset, `scripts/mock-dataset.mjs`, feeds two outputs. Run
`npm run mock:build` after editing it.

| Output | Used by | Dynamic? |
| --- | --- | --- |
| `mock-api/` | the published demo, served as static files at `/api/v1/` | no |
| `mockoon/drivoo-api.json` | local development via `npm run mock` | yes |

## Why the static files have no extension

The app asks for `reports/summary`. A static host serves the path exactly as
requested, so the file is named `summary`, not `summary.json` — the latter would
404. Angular parses the body as JSON from the request's `responseType`, so the
missing `Content-Type` does not matter.

## What the demo cannot do

A static host ignores the query string, so `?from=…&to=…` has no effect and the
figures do not change when the date range changes. Everything else — the network
requests, the response shapes, the rendering — is real. Point
`environment.demo.ts` at a hosted Mockoon instance if dynamic filtering is
needed for a demo.

## Local development

```bash
npm install
npm run dev     # Mockoon on :3000 and the app together
```
