/**
 * Default environment — local development against the Mockoon server.
 *
 * Start it with `npm run mock` (or open mockoon/drivoo-api.json in the Mockoon
 * desktop app) before running `npm start`.
 */
export const environment = {
  production: false,
  /** Base URL for every business endpoint. Mockoon serves them under `endpointPrefix: api/v1/`. */
  /** Only the published demo skips authentication; see auth.guard.ts. */
  demoAccess: false,
  apiUrl: 'http://localhost:3000/api/v1/',
};
