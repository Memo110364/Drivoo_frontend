/**
 * Demo environment — the build published for review.
 *
 * The API is served from the same site as static JSON at `api/v1/...`, so the
 * app makes genuine network requests (visible in the browser's Network tab)
 * with no server to host and no in-app stand-in. Responses do not vary with the
 * date filter; point `apiUrl` at a hosted Mockoon instance when that matters.
 */
export const environment = {
  production: true,
  /** No backend behind the demo can answer a login POST, so it is not gated. */
  demoAccess: true,
  apiUrl: 'api/v1/',
};
