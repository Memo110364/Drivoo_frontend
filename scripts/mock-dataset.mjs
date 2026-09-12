/**
 * The single source of demo data for the reports API.
 *
 * One dataset feeds both outputs: the Mockoon environment used for local
 * development, and the static JSON the published demo is served from. Nothing
 * here is business logic — it exists only so the screens have something to
 * render before the real API is connected. Every field marked PROVISIONAL in
 * docs/backend-requirements.md is a placeholder awaiting the real contract.
 */

/** Deterministic generator, so the demo shows the same figures on every visit. */
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
const rand = seeded(20260912);
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

/**
 * Builds one comparison row. Counts come first, then the two rates derived from
 * them, so a consumer never has to divide and the frontend never disagrees with
 * the backend about a denominator.
 */
function row(key, label, orders, deliveredShare, returnShare, avgDays, unitRevenue) {
  const shipped = Math.round(orders * 0.92);
  const settled = Math.round(orders * (deliveredShare + returnShare));
  const returned = Math.round(settled * (returnShare / (deliveredShare + returnShare)));
  const delivered = settled - returned;
  const finalised = delivered + returned;
  return {
    key,
    label,
    orders,
    shipped,
    delivered,
    returned,
    delivery_success_rate: finalised ? Number(((delivered / finalised) * 100).toFixed(1)) : 0,
    return_rate: finalised ? Number(((returned / finalised) * 100).toFixed(1)) : 0,
    avg_delivery_days: avgDays,
    revenue: delivered * unitRevenue,
  };
}

// PROVISIONAL — invented names, not real companies, standing in until the
// backend exposes the carrier list. The figures deliberately differ so the tab
// demonstrates its point: the busiest carrier is not the best performing one.
export const CARRIERS = [
  row('c1', 'سريع إكسبرس', 1180, 0.62, 0.05, 2.8, 640),
  row('c2', 'كارجو النيل', 860, 0.58, 0.08, 3.6, 610),
  row('c3', 'دلتا لوجيستكس', 430, 0.5, 0.12, 4.4, 590),
];

export const CITIES = [
  row('1', 'القاهرة', 890, 0.64, 0.05, 2.4, 650),
  row('2', 'الإسكندرية', 540, 0.6, 0.07, 3.1, 620),
  row('3', 'الجيزة', 620, 0.62, 0.06, 2.6, 640),
  row('4', 'بورسعيد', 180, 0.55, 0.1, 4.0, 600),
  row('5', 'أسوان', 120, 0.48, 0.14, 5.2, 580),
  row('6', 'الأقصر', 120, 0.5, 0.12, 4.8, 590),
];

export const AREAS = [
  row('101', 'مدينة نصر', 310, 0.68, 0.04, 2.1, 660),
  row('102', 'المعادي', 240, 0.66, 0.05, 2.3, 650),
  row('103', 'مصر الجديدة', 190, 0.64, 0.05, 2.4, 640),
  row('105', 'السادس من أكتوبر', 150, 0.58, 0.09, 3.2, 620),
  row('201', 'سموحة', 210, 0.62, 0.06, 3.0, 630),
  row('204', 'برج العرب', 90, 0.5, 0.13, 4.6, 590),
  row('301', 'الدقي', 260, 0.67, 0.04, 2.2, 655),
  row('303', 'الهرم', 200, 0.52, 0.13, 3.4, 600),
];

export const PRODUCTS = [
  row('p1', 'سماعة بلوتوث لاسلكية', 420, 0.66, 0.05, 2.6, 520),
  row('p2', 'ساعة يد رجالي كلاسيك', 360, 0.62, 0.07, 2.9, 740),
  row('p3', 'مكواة شعر سيراميك', 300, 0.6, 0.08, 3.0, 480),
  row('p4', 'شاحن سريع 65 وات', 280, 0.68, 0.04, 2.5, 310),
  row('p5', 'حقيبة ظهر مقاومة للماء', 240, 0.58, 0.1, 3.3, 560),
  row('p6', 'كريم مرطب بفيتامين C', 190, 0.55, 0.11, 3.5, 290),
];

// PROVISIONAL — `store` identifies the merchant's own storefront, not a traffic
// source; confirm with the backend whether a merchant can have more than one.
// A merchant can run more than one storefront, so this tab compares them.
// `store` is the storefront itself, not a traffic source — no acquisition
// channel can be inferred from it. Order counts total the same as every other
// dimension, so the tabs reconcile.
export const STORES = [
  row('s1', 'المتجر الرئيسي', 1180, 0.63, 0.05, 2.9, 640),
  row('s2', 'متجر الأزياء', 790, 0.58, 0.09, 3.4, 610),
  row('s3', 'متجر الإلكترونيات', 500, 0.6, 0.07, 3.1, 680),
];

// PROVISIONAL — codes await the real backend enum.
export const RETURN_REASONS = [
  { code: 'customer_refused', count: 84 },
  { code: 'unreachable', count: 61 },
  { code: 'postponed_expired', count: 38 },
  { code: 'wrong_address', count: 27 },
  { code: 'item_mismatch', count: 19 },
  { code: 'damaged', count: 8 },
  { code: 'other', count: 11 },
];

/** Totals are summed from the dimension rows so every tab reconciles. */
function totals(rows) {
  const sum = (field) => rows.reduce((acc, r) => acc + r[field], 0);
  const delivered = sum('delivered');
  const returned = sum('returned');
  const finalised = delivered + returned;
  return {
    total_orders: sum('orders'),
    shipped: sum('shipped'),
    delivered,
    returned,
    // Orders that exist but have not shipped yet.
    awaiting_shipment: sum('orders') - sum('shipped'),
    cancelled: 0,
    revenue: sum('revenue'),
    cod_collected: Math.round(sum('revenue') * 0.98),
    delivery_success_rate: finalised ? Number(((delivered / finalised) * 100).toFixed(1)) : 0,
    return_rate: finalised ? Number(((returned / finalised) * 100).toFixed(1)) : 0,
    avg_delivery_days: 3.1,
  };
}

export const SUMMARY = totals(CITIES);

export const STATUS_BREAKDOWN = (() => {
  const s = SUMMARY;
  const pending = Math.round(s.awaiting_shipment * 0.45);
  const confirmed = s.awaiting_shipment - pending;
  const inShipping = s.shipped - s.delivered - s.returned;
  const groups = [
    ['pending', pending],
    ['confirmed', confirmed],
    ['in_shipping', Math.max(inShipping, 0)],
    ['delivered', s.delivered],
    ['returned', s.returned],
    ['cancelled', s.cancelled],
  ];
  const total = groups.reduce((acc, [, n]) => acc + n, 0);
  return {
    total,
    data: groups.map(([group, count]) => ({
      group,
      count,
      percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0,
    })),
  };
})();

export const CONFIRMATION_FUNNEL = (() => {
  const s = SUMMARY;
  const confirmed = Math.round(s.total_orders * 0.86);
  return {
    placed: s.total_orders,
    confirmed,
    shipped: s.shipped,
    delivered: s.delivered,
    lost_at_confirmation: s.total_orders - confirmed,
    // `confirm_attempted` already exists per order, so this needs no new field.
    attempts: [
      { attempts: 0, orders: s.total_orders - confirmed },
      { attempts: 1, orders: Math.round(confirmed * 0.58) },
      { attempts: 2, orders: Math.round(confirmed * 0.27) },
      { attempts: 3, orders: Math.round(confirmed * 0.11) },
      { attempts: 4, orders: Math.round(confirmed * 0.04) },
    ],
  };
})();

/** Thirty days of daily counts, shaped so the four series stay consistent. */
export const ORDERS_OVER_TIME = (() => {
  const labels = [];
  const total = [];
  const shipped = [];
  const delivered = [];
  const returned = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    labels.push(day.toISOString().slice(0, 10));
    const weekday = day.getDay();
    const weekly = weekday === 5 ? 0.6 : weekday === 6 ? 0.85 : 1;
    const t = Math.max(1, Math.round((60 + (29 - i) * 1.2) * weekly * (0.8 + rand() * 0.4)));
    const sh = Math.round(t * 0.9);
    const de = Math.round(sh * (0.6 + rand() * 0.1));
    total.push(t);
    shipped.push(sh);
    delivered.push(de);
    returned.push(Math.max(0, Math.round(de * (0.05 + rand() * 0.06))));
  }
  return { labels, total, shipped, delivered, returned };
})();

export const RETURN_REASON_REPORT = (() => {
  const total = RETURN_REASONS.reduce((acc, r) => acc + r.count, 0);
  return {
    total,
    data: RETURN_REASONS.map((r) => ({
      ...r,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
    })),
  };
})();

export const PERFORMANCE = {
  carrier: CARRIERS,
  city: CITIES,
  area: AREAS,
  product: PRODUCTS,
  store: STORES,
};

// ---------------------------------------------------------------------------
// Order detail rows
//
// The comparison tabs aggregate; this one lists. It is the report a merchant
// opens to find a specific order, or to hand the whole period to a spreadsheet,
// so it carries the order code, who it is for, where it went, its status and
// what it is worth.
// ---------------------------------------------------------------------------

const CUSTOMER_NAMES = [
  'رضا محمد هاشم', 'أحمد صفار', 'منى عبد الرحمن', 'كريم السيد', 'هبة فتحي',
  'محمود الشناوي', 'سارة عادل', 'عمرو زكي', 'نورهان مصطفى', 'يوسف الجندي',
  'دينا حلمي', 'طارق عبد العزيز', 'مريم شعبان', 'إسلام بدر', 'شيماء رمضان',
];

/** Cities paired with the areas that belong to them, so rows stay coherent. */
const CITY_AREAS = {
  'القاهرة': ['مدينة نصر', 'المعادي', 'مصر الجديدة', 'السادس من أكتوبر'],
  'الإسكندرية': ['سموحة', 'برج العرب'],
  'الجيزة': ['الدقي', 'الهرم'],
  'بورسعيد': ['المناخ'],
  'أسوان': ['الكورنيش'],
  'الأقصر': ['الضفة الشرقية'],
};

/**
 * The six statuses the reports group by, each with the backend status code it
 * rolls up from. PROVISIONAL: the real system has nineteen numeric statuses;
 * these are the ones the demo shows.
 */
const STATUS_POOL = [
  { group: 'delivered', code: '9', weight: 55 },
  { group: 'in_shipping', code: '7', weight: 14 },
  { group: 'confirmed', code: '10', weight: 12 },
  { group: 'pending', code: '1', weight: 9 },
  { group: 'returned', code: '5', weight: 7 },
  { group: 'cancelled', code: '4', weight: 3 },
];

function drawStatus() {
  const total = STATUS_POOL.reduce((acc, s) => acc + s.weight, 0);
  let roll = rand() * total;
  for (const status of STATUS_POOL) {
    roll -= status.weight;
    if (roll <= 0) return status;
  }
  return STATUS_POOL[0];
}

const ORDER_PREFIXES = ['EGY', 'PCA', 'ALX', 'RRQ'];

/** Sixty rows — enough to exercise paging, filtering and export in a demo. */
export const ORDER_ROWS = Array.from({ length: 60 }, (_, index) => {
  const cityNames = Object.keys(CITY_AREAS);
  const city = cityNames[Math.floor(rand() * cityNames.length)];
  const areas = CITY_AREAS[city];
  const area = areas[Math.floor(rand() * areas.length)];
  const status = drawStatus();
  const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)];
  const store = STORES[Math.floor(rand() * STORES.length)];

  const created = new Date();
  created.setHours(12, 0, 0, 0);
  created.setDate(created.getDate() - between(0, 29));

  const itemsCount = between(1, 4);
  const goodsTotal = between(180, 2400);
  const shippingCost = between(45, 120);

  return {
    id: 1000000 + index,
    order_code: `${ORDER_PREFIXES[index % ORDER_PREFIXES.length]}${1000000 + index}`,
    date: created.toISOString(),
    customer_name: CUSTOMER_NAMES[Math.floor(rand() * CUSTOMER_NAMES.length)],
    customer_phone: `011${between(10000000, 99999999)}`,
    city,
    area,
    store: store.label,
    carrier: carrier.label,
    items_count: itemsCount,
    /** The group the reports filter by. */
    status: status.group,
    /** The backend's own numeric status, kept so a row can be traced back. */
    status_code: status.code,
    goods_total: goodsTotal,
    shipping_cost: shippingCost,
    /** What the customer pays on delivery. */
    total: goodsTotal + shippingCost,
  };
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

/** Paged envelope, matching what the real endpoint is expected to return. */
export const ORDERS_PAGE = {
  page: 1,
  limit: ORDER_ROWS.length,
  total: ORDER_ROWS.length,
  data: ORDER_ROWS,
};
