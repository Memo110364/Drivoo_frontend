/**
 * Local development against a real API — the address the backend runs on.
 *
 * This is the single place that decides which API the app talks to. Every
 * service reads it through BaseService; no component holds an address.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1/',
  /** The published demo has no backend to authenticate against. Never true here. */
  demoAccess: false,
};
