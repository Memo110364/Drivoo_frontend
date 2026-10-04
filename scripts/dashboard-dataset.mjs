/**
 * Demo data for the dashboard.
 *
 * Nothing here is business logic — it exists only so the screen has something
 * to render before the real API is connected. The figures are built to
 * reconcile, so the screen never contradicts itself:
 *
 *   total_orders = pending + shipped + delivered + returned + cancelled
 *   delivery_rate = delivered / (delivered + returned) * 100
 *   the trend series sum to the headline counts
 */

/** Deterministic, so the demo shows the same figures on every visit. */
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 30;
const rand = seeded(20261004);

/** `days` back from today as `YYYY-MM-DD`. */
function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// The daily series the trend chart draws. The headline counts are summed from
// these rather than written separately, so the chart and the KPIs agree.
// ---------------------------------------------------------------------------

const labels = [];
const total = [];
const shipped = [];
const delivered = [];
const returned = [];

for (let i = DAYS - 1; i >= 0; i -= 1) {
  labels.push(daysAgo(i));
  // A working week has a shape: quieter on Friday, busiest early in the week.
  const weekday = new Date(Date.now() - i * 86400000).getDay();
  const seasonal = weekday === 5 ? 0.55 : weekday === 6 ? 0.8 : 1;
  const day = Math.round((70 + rand() * 40) * seasonal);
  const dayShipped = Math.round(day * 0.92);
  const dayReturned = Math.round(dayShipped * (0.06 + rand() * 0.05));
  const dayDelivered = Math.round(dayShipped * 0.78) - dayReturned > 0
    ? Math.round(dayShipped * 0.78)
    : dayShipped - dayReturned;

  total.push(day);
  shipped.push(dayShipped);
  delivered.push(dayDelivered);
  returned.push(dayReturned);
}

const sum = (series) => series.reduce((running, value) => running + value, 0);

const TOTAL_ORDERS = sum(total);
const SHIPPED = sum(shipped);
const DELIVERED = sum(delivered);
const RETURNED = sum(returned);
// Everything shipped that has not settled yet, plus what never shipped.
const CANCELLED = Math.round(TOTAL_ORDERS * 0.03);
const PENDING = TOTAL_ORDERS - SHIPPED - CANCELLED;

/** Both rates share one denominator: orders whose outcome is final. */
const FINALISED = DELIVERED + RETURNED;
const rate = (part) => Number(((part / FINALISED) * 100).toFixed(1));

const GOODS_PER_ORDER = 610;
const REVENUE = DELIVERED * GOODS_PER_ORDER;
const COD_COLLECTED = Math.round(REVENUE * 0.94);

export const DASHBOARD_SUMMARY = {
  total_orders: TOTAL_ORDERS,
  shipped: SHIPPED,
  delivered: DELIVERED,
  returned: RETURNED,
  pending: PENDING,
  cancelled: CANCELLED,
  revenue: REVENUE,
  net_profit: Math.round(REVENUE * 0.27),
  cod_collected: COD_COLLECTED,
  cod_success_rate: Number(((COD_COLLECTED / REVENUE) * 100).toFixed(1)),
  delivery_rate: rate(DELIVERED),
  return_rate: rate(RETURNED),
  avg_delivery_days: 2.8,
  // PROVISIONAL — a real trend compares against the preceding period of equal
  // length, which the backend has to compute; these are placeholders.
  trends: {
    total_orders: 8.4,
    revenue: 11.2,
    net_profit: 6.9,
    cod_collected: 10.1,
    delivered: 9.3,
    shipped: 7.8,
    pending: -4.2,
    returned: -2.6,
    delivery_rate: 1.4,
    return_rate: -1.4,
    avg_delivery_days: -0.3,
    cod_success_rate: 0.8,
  },
};

export const ORDERS_OVER_TIME = { labels, total, shipped, delivered, returned };

// The donut. Its slices sum to total_orders, so the chart's centre figure and
// the headline count cannot disagree — and each carries its own `percentage`,
// because the legend reads that rather than dividing for itself.
//
// `pending` is placed but not yet confirmed; `confirmed` is confirmed but not
// yet shipped. The screen lists both, so both have to be here.
const CONFIRMED = Math.round(PENDING * 0.42);

const SLICES = [
  { group: 'pending', count: PENDING - CONFIRMED },
  { group: 'confirmed', count: CONFIRMED },
  { group: 'in_shipping', count: SHIPPED - DELIVERED - RETURNED },
  { group: 'delivered', count: DELIVERED },
  { group: 'returned', count: RETURNED },
  { group: 'cancelled', count: CANCELLED },
];

export const STATUS_BREAKDOWN = {
  total: TOTAL_ORDERS,
  data: SLICES.map((slice) => ({
    ...slice,
    percentage: Number(((slice.count / TOTAL_ORDERS) * 100).toFixed(1)),
  })),
};

// ---------------------------------------------------------------------------
// How long still-open orders have been waiting. PROVISIONAL: this needs a
// timestamp per status transition, which the backend does not expose.
// ---------------------------------------------------------------------------

const AGING = [
  { bucket: '0_2', count: Math.round(PENDING * 0.52) },
  { bucket: '3_5', count: Math.round(PENDING * 0.28) },
  { bucket: '6_7', count: Math.round(PENDING * 0.13) },
];
AGING.push({
  bucket: 'over_7',
  count: PENDING - AGING.reduce((running, bucket) => running + bucket.count, 0),
});

export const ORDERS_AGING = { total: PENDING, data: AGING };

// ---------------------------------------------------------------------------
// What the merchant is expected to act on. The backend decides what counts and
// how urgent it is, so the dashboard cannot disagree with the screen each
// alert leads to.
// ---------------------------------------------------------------------------

export const ATTENTION = {
  data: [
    { key: 'delayed_orders', count: AGING[3].count, severity: 'high', route: '/orders' },
    { key: 'pending_confirmation', count: Math.round(PENDING * 0.31), severity: 'medium', route: '/orders' },
    { key: 'returns_pending_receipt', count: Math.round(RETURNED * 0.22), severity: 'medium', route: '/orders' },
    { key: 'low_stock_products', count: 18, severity: 'low', route: '/products' },
  ],
};

/** Counted in products, not pieces. The three states sum to the catalogue. */
export const DASHBOARD_INVENTORY = {
  total_products: 120,
  in_stock: 96,
  low_stock: 18,
  out_of_stock: 6,
};

// ---------------------------------------------------------------------------
// Best sellers. PROVISIONAL names; ranked by the backend rather than the
// frontend, so the screen and any report agree on what "top" means.
// ---------------------------------------------------------------------------

const PRODUCTS = [
  ['سماعة بلوتوث لاسلكية', 420, 520],
  ['ساعة يد رجالي كلاسيك', 360, 740],
  ['مكواة شعر سيراميك', 300, 480],
  ['شاحن سريع 65 وات', 280, 310],
  ['حقيبة ظهر مقاومة للماء', 240, 560],
];

export const TOP_PRODUCTS = {
  data: PRODUCTS.map(([name, orders, unitRevenue], index) => {
    const quantity = Math.round(orders * (1.1 + index * 0.05));
    return {
      id: index + 1,
      name,
      image: './assets/images/products/s1.jpg',
      quantity,
      orders,
      revenue: quantity * unitRevenue,
    };
  }),
};
