/**
 * Default environment — local development against the Mockoon server.
 *
 * Run Mockoon with the `Moyaser` environment (port 3000) before `npm start`.
 */
export const environment = {
  production: false,
  /** Base URL for every business endpoint. Mockoon serves them under `endpointPrefix: api/v1/`. */
  apiUrl: 'http://localhost:3000/api/v1/',
  /** When true the app answers its own HTTP calls from bundled demo data (no backend needed). */
  useMockApi: false,
  /** Artificial delay (ms) applied by the mock backend so the UI loading states stay visible. */
  mockLatency: 400,
};
