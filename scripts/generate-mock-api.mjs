/**
 * Writes both API stand-ins from one dataset:
 *
 *   mock-api/   static JSON, published with the app so the demo link makes real
 *               network requests without a server to host
 *   mockoon/    a Mockoon environment for local development, where the same
 *               routes answer dynamically
 *
 * Run with `npm run mock:build` after editing scripts/wallet-dataset.mjs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  BALANCE,
  CASH_BRANCHES,
  LEDGER,
  PAYMENT_METHODS,
  WITHDRAWALS,
  WITHDRAWAL_ELIGIBILITY,
  WITHDRAWAL_RULES,
} from './wallet-dataset.mjs';
import {
  ATTENTION,
  DASHBOARD_INVENTORY,
  DASHBOARD_SUMMARY,
  ORDERS_AGING,
  ORDERS_OVER_TIME,
  STATUS_BREAKDOWN,
  TOP_PRODUCTS,
} from './dashboard-dataset.mjs';
import {
  CANCELLATION_REASON_REPORT,
  CONFIRMATION_BY_PRODUCT,
  CONFIRMATION_FUNNEL,
  INVENTORY,
  INVENTORY_MOVEMENTS,
  ORDERS_PAGE,
  PERFORMANCE,
  RETURN_REASON_REPORT,
  SUMMARY,
} from './reports-dataset.mjs';

/** Every route the wallet screen calls, with the body each one returns. */
const ROUTES = [
  // The reports screen. `orders-over-time`, `status-breakdown` and
  // `top-products` are shared with the dashboard and declared once, below.
  { method: 'get', endpoint: 'reports/summary', body: SUMMARY },
  { method: 'get', endpoint: 'reports/returns-by-reason', body: RETURN_REASON_REPORT },
  { method: 'get', endpoint: 'reports/confirmation-funnel', body: CONFIRMATION_FUNNEL },
  { method: 'get', endpoint: 'reports/cancellation-reasons', body: CANCELLATION_REASON_REPORT },
  { method: 'get', endpoint: 'reports/confirmation-by-product', body: CONFIRMATION_BY_PRODUCT },
  { method: 'get', endpoint: 'reports/inventory', body: INVENTORY },
  { method: 'get', endpoint: 'reports/orders', body: ORDERS_PAGE },
  ...Object.entries(PERFORMANCE).map(([dimension, data]) => ({
    method: 'get',
    endpoint: `reports/performance/${dimension}`,
    body: { group_by: dimension, data },
  })),
  // One route per product: a static host cannot read a path parameter, so the
  // demo needs the ledger already split by product. The real API takes the id
  // as a path segment on a single route.
  ...Object.entries(INVENTORY_MOVEMENTS).map(([productId, body]) => ({
    method: 'get',
    endpoint: `reports/inventory-movements/${productId}`,
    body,
  })),

  { method: 'get', endpoint: 'reports/dashboard/summary', body: DASHBOARD_SUMMARY },
  { method: 'get', endpoint: 'reports/dashboard/orders-aging', body: ORDERS_AGING },
  { method: 'get', endpoint: 'reports/dashboard/attention', body: ATTENTION },
  { method: 'get', endpoint: 'reports/dashboard/inventory', body: DASHBOARD_INVENTORY },
  { method: 'get', endpoint: 'reports/orders-over-time', body: ORDERS_OVER_TIME },
  { method: 'get', endpoint: 'reports/status-breakdown', body: STATUS_BREAKDOWN },
  { method: 'get', endpoint: 'reports/top-products', body: TOP_PRODUCTS },

  { method: 'get', endpoint: 'wallet/balance', body: BALANCE },
  { method: 'get', endpoint: 'wallet/ledger', body: LEDGER },
  { method: 'get', endpoint: 'wallet/payment-methods', body: { data: PAYMENT_METHODS } },
  { method: 'get', endpoint: 'wallet/cash-branches', body: CASH_BRANCHES },
  { method: 'get', endpoint: 'wallet/withdrawals', body: WITHDRAWALS },
  // Rules and eligibility travel together: the screen needs both to decide
  // whether to offer the form and how to fill it, so one request carries them.
  // Keeping it off `wallet/withdrawals/...` also keeps that path a plain list —
  // a static host cannot serve one path as both a file and a directory.
  {
    method: 'get',
    endpoint: 'wallet/withdrawal-options',
    body: { rules: WITHDRAWAL_RULES, eligibility: WITHDRAWAL_ELIGIBILITY },
  },
  {
    method: 'post',
    endpoint: 'user/login',
    body: {
      id: '123324',
      name: 'محمود حسن',
      email: 'mahmoud@example.com',
      phone: '01000000000',
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
    },
  },
  { method: 'post', endpoint: 'auth/refresh', body: { accessToken: 'demo-access-token' } },
  // Writes exist so a developer running Mockoon can exercise the forms. The
  // static demo cannot answer them — see the note in docs/mock-api.md.
  {
    method: 'post',
    endpoint: 'wallet/withdrawals',
    body: { message: 'تم استلام طلب السحب', code: '110642' },
  },
  {
    method: 'post',
    endpoint: 'wallet/payment-methods',
    body: { message: 'تمت إضافة وسيلة الاستلام' },
  },
  {
    method: 'delete',
    endpoint: 'wallet/payment-methods/:id',
    body: { message: 'تم حذف وسيلة الاستلام' },
  },
  {
    method: 'put',
    endpoint: 'wallet/payment-methods/:id/default',
    body: { message: 'تم ضبط وسيلة الاستلام الافتراضية' },
  },
];

const write = (path, body) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
};

// ---------------------------------------------------------------------------
// Static JSON for the published demo
// ---------------------------------------------------------------------------

let staticCount = 0;
// Written without a file extension, because the app asks for `wallet/balance`
// and a static host serves the path exactly as requested — `balance.json`
// would simply 404.
for (const route of ROUTES) {
  if (route.method !== 'get') continue;
  write(join('mock-api', route.endpoint), route.body);
  staticCount += 1;
}

// ---------------------------------------------------------------------------
// Mockoon environment for local development
// ---------------------------------------------------------------------------

/**
 * A stable id, derived from what it identifies rather than drawn at random.
 *
 * Mockoon keys everything by uuid, but it never has to be *random* — only
 * unique and well-formed. Generating a fresh one each run rewrote all 58 ids
 * on every build, so the file showed as modified after any `npm run build`
 * even though nothing about the API had changed. That churn is noise in a
 * diff and, worse, a source of merge conflicts between branches that had
 * changed nothing.
 */
function stableUuid(...parts) {
  const hex = createHash('sha1').update(parts.join(':')).digest('hex');
  // Shaped as a v4 uuid so Mockoon reads it the same way as a random one.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

const mockoonRoute = (route) => ({
  uuid: stableUuid('route', route.method, route.endpoint),
  type: 'http',
  documentation: '',
  method: route.method,
  endpoint: `api/v1/${route.endpoint}`,
  responses: [
    {
      uuid: stableUuid('response', route.method, route.endpoint),
      body: JSON.stringify(route.body, null, 2),
      latency: 0,
      statusCode: 200,
      label: '',
      headers: [],
      bodyType: 'INLINE',
      filePath: '',
      databucketID: '',
      sendFileAsBody: false,
      rules: [],
      rulesOperator: 'OR',
      disableTemplating: false,
      fallbackTo404: false,
      default: true,
      crudKey: 'id',
      callbacks: [],
    },
  ],
  responseMode: null,
  streamingMode: null,
  streamingInterval: 0,
});

const environment = {
  uuid: stableUuid('environment', 'drivoo'),
  lastMigration: 33,
  name: 'Drivoo Wallet API',
  endpointPrefix: '',
  latency: 0,
  port: 3000,
  hostname: '',
  folders: [],
  routes: ROUTES.map(mockoonRoute),
  rootChildren: [],
  proxyMode: false,
  proxyHost: '',
  proxyRemovePrefix: false,
  tlsOptions: { enabled: false, type: 'CERT', pfxPath: '', certPath: '', keyPath: '', caPath: '', passphrase: '' },
  cors: true,
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  proxyReqHeaders: [{ key: '', value: '' }],
  proxyResHeaders: [{ key: '', value: '' }],
  data: [],
  callbacks: [],
};
environment.rootChildren = environment.routes.map((route) => ({ type: 'route', uuid: route.uuid }));

write(join('mockoon', 'drivoo-wallet-api.json'), environment);

console.log(`static JSON files: ${staticCount}`);
console.log(`mockoon routes:    ${ROUTES.length}`);
