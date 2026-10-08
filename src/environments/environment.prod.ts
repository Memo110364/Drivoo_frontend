/**
 * Production environment — points at the real Drivoo backend.
 */
export const environment = {
  production: true,
  /** Only the published demo skips authentication; see auth.guard.ts. */
  demoAccess: false,
  apiUrl: 'https://api.drivoo.co/api/v1/',
};
