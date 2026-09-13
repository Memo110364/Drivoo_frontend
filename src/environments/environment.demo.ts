/**
 * Demo environment — the build published to GitHub Pages.
 *
 * There is no backend behind the public link, so `useMockApi` turns on the
 * in-app mock backend (see `src/app/mock`) which replays the same payloads
 * the Mockoon environment returns.
 */
export const environment = {
  production: true,
  apiUrl: '/api/v1/',
  useMockApi: true,
  mockLatency: 400,
};
