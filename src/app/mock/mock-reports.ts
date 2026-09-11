/**
 * Report aggregations for the demo backend.
 *
 * These functions define the payload contract of the `reports/*` endpoints, so
 * the real backend can be written against them one-for-one.
 */
import {
  CITIES,
  DASHBOARD_STATUS_GROUPS,
  MockOrder,
  ORDERS,
  PRODUCTS,
  dashboardGroupOfStatus,
  dayKey,
  groupOfStatus,
} from './mock-data';

export interface ReportFilters {
  /** Inclusive `YYYY-MM-DD` bounds. */
  from?: string;
  to?: string;
  /** City id, or empty for every city. */
  city_id?: string;
  /** One of `pending | shipped | delivered | failed`, or empty for all. */
  status_group?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function filterOrders(filters: ReportFilters): MockOrder[] {
  const from = parseDay(filters.from);
  const to = parseDay(filters.to);
  if (to) to.setHours(23, 59, 59, 999);

  return ORDERS.filter((order) => {
    const placed = new Date(order.date);
    if (from && placed < from) return false;
    if (to && placed > to) return false;
    if (filters.city_id && String(order.city.id) !== String(filters.city_id)) return false;
    if (filters.status_group && groupOfStatus(order.status) !== filters.status_group) return false;
    return true;
  });
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

interface Totals {
  total_orders: number;
  delivered: number;
  shipped: number;
  pending: number;
  failed: number;
  /** Finer split of `pending` and `failed`, for the dashboard's six statuses. */
  confirmed: number;
  returned: number;
  cancelled: number;
  cod_collected: number;
  cod_success_rate: number;
  goods_total: number;
  shipping_cost: number;
  commission: number;
  revenue: number;
  net_profit: number;
  delivery_rate: number;
  return_rate: number;
  avg_delivery_days: number;
}

function totalsOf(orders: MockOrder[]): Totals {
  const counts = { delivered: 0, shipped: 0, pending: 0, failed: 0 };
  const fine = { pending: 0, confirmed: 0, in_shipping: 0, delivered: 0, returned: 0, cancelled: 0 };
  let codCollected = 0;
  let codDue = 0;
  let codCollectedCount = 0;
  let goods = 0;
  let shipping = 0;
  let commission = 0;
  let revenue = 0;
  let profit = 0;
  let deliveryDaysSum = 0;
  let deliveredWithDays = 0;

  for (const order of orders) {
    const group = groupOfStatus(order.status) as keyof typeof counts;
    counts[group] += 1;
    fine[dashboardGroupOfStatus(order.status) as keyof typeof fine] += 1;
    goods += order.goods_total;
    shipping += order.shipping_cost;
    commission += order.commission;
    profit += order.net_profit;
    if (group === 'delivered') {
      revenue += order.goods_total + order.shipping_cost;
      codDue += order.cod_amount;
      if (order.cod_collected) {
        codCollected += order.cod_amount;
        codCollectedCount += 1;
      }
      if (order.delivery_days != null) {
        deliveryDaysSum += order.delivery_days;
        deliveredWithDays += 1;
      }
    }
  }

  // Delivery and return rates are measured against orders that reached a final
  // state, so orders still in transit do not drag the percentages down.
  const settled = counts.delivered + counts.failed;
  return {
    total_orders: orders.length,
    ...counts,
    confirmed: fine.confirmed,
    returned: fine.returned,
    cancelled: fine.cancelled,
    cod_collected: Math.round(codCollected),
    cod_success_rate: codDue
      ? Number(((codCollected / codDue) * 100).toFixed(1))
      : 0,
    goods_total: Math.round(goods),
    shipping_cost: Math.round(shipping),
    commission: Math.round(commission),
    revenue: Math.round(revenue),
    net_profit: Math.round(profit),
    delivery_rate: settled ? Number(((counts.delivered / settled) * 100).toFixed(1)) : 0,
    return_rate: settled ? Number(((counts.failed / settled) * 100).toFixed(1)) : 0,
    avg_delivery_days: deliveredWithDays
      ? Number((deliveryDaysSum / deliveredWithDays).toFixed(1))
      : 0,
  };
}

/** KPI block plus period-over-period trends. */
export function reportSummary(filters: ReportFilters) {
  const current = totalsOf(filterOrders(filters));

  const from = parseDay(filters.from);
  const to = parseDay(filters.to);
  let previous = current;
  if (from && to) {
    const span = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);
    const prevTo = new Date(from.getTime() - DAY_MS);
    const prevFrom = new Date(prevTo.getTime() - (span - 1) * DAY_MS);
    previous = totalsOf(
      filterOrders({ ...filters, from: dayKey(prevFrom), to: dayKey(prevTo) })
    );
  }

  return {
    ...current,
    trends: {
      total_orders: percentChange(current.total_orders, previous.total_orders),
      revenue: percentChange(current.revenue, previous.revenue),
      net_profit: percentChange(current.net_profit, previous.net_profit),
      cod_collected: percentChange(current.cod_collected, previous.cod_collected),
      delivered: percentChange(current.delivered, previous.delivered),
      shipped: percentChange(current.shipped, previous.shipped),
      pending: percentChange(current.pending, previous.pending),
      returned: percentChange(current.returned, previous.returned),
      delivery_rate: Number((current.delivery_rate - previous.delivery_rate).toFixed(1)),
      return_rate: Number((current.return_rate - previous.return_rate).toFixed(1)),
      avg_delivery_days: Number(
        (current.avg_delivery_days - previous.avg_delivery_days).toFixed(1)
      ),
      cod_success_rate: Number(
        (current.cod_success_rate - previous.cod_success_rate).toFixed(1)
      ),
    },
  };
}

/** Daily series: every day in range, total / delivered / failed. */
export function ordersOverTime(filters: ReportFilters) {
  const orders = filterOrders(filters);
  const from = parseDay(filters.from);
  const to = parseDay(filters.to);
  if (!from || !to) return { labels: [], total: [], shipped: [], delivered: [], failed: [] };

  const empty = () => ({ total: 0, shipped: 0, delivered: 0, failed: 0 });
  const buckets = new Map<string, ReturnType<typeof empty>>();
  for (let day = new Date(from); day <= to; day = new Date(day.getTime() + DAY_MS)) {
    buckets.set(dayKey(day), empty());
  }
  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.date));
    if (!bucket) continue;
    bucket.total += 1;
    const group = groupOfStatus(order.status);
    if (group === 'delivered') bucket.delivered += 1;
    if (group === 'shipped') bucket.shipped += 1;
    if (group === 'failed') bucket.failed += 1;
  }

  const labels = [...buckets.keys()];
  return {
    labels,
    total: labels.map((label) => buckets.get(label)!.total),
    shipped: labels.map((label) => buckets.get(label)!.shipped),
    delivered: labels.map((label) => buckets.get(label)!.delivered),
    failed: labels.map((label) => buckets.get(label)!.failed),
  };
}

/** Donut source: how the orders split across the six dashboard statuses. */
export function statusBreakdown(filters: ReportFilters) {
  const orders = filterOrders(filters);
  const groups = Object.keys(DASHBOARD_STATUS_GROUPS);
  const counts = groups.map(
    (group) => orders.filter((order) => dashboardGroupOfStatus(order.status) === group).length
  );
  const total = counts.reduce((sum, value) => sum + value, 0);
  return {
    total,
    data: groups.map((group, index) => ({
      group,
      count: counts[index],
      percentage: total ? Number(((counts[index] / total) * 100).toFixed(1)) : 0,
    })),
  };
}

/** Best sellers by delivered revenue. */
export function topProducts(filters: ReportFilters, limit = 8) {
  const orders = filterOrders(filters);
  const totals = new Map<
    number,
    { id: number; name: string; image: string; quantity: number; orders: number; revenue: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const entry = totals.get(item.product_id) ?? {
        id: item.product_id,
        name: item.product_name,
        image: item.image,
        quantity: 0,
        orders: 0,
        revenue: 0,
      };
      entry.quantity += item.quantity;
      entry.orders += 1;
      entry.revenue += item.amount;
      totals.set(item.product_id, entry);
    }
  }

  return {
    data: [...totals.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((entry) => ({ ...entry, revenue: Math.round(entry.revenue) })),
  };
}

/** One row per city — the table and the bar chart both read this. */
export function citiesPerformance(filters: ReportFilters) {
  const rows = CITIES.map((city) => {
    const cityOrders = filterOrders({ ...filters, city_id: city.id });
    const totals = totalsOf(cityOrders);
    return {
      city_id: city.id,
      city_name: city.name_ar,
      city_name_en: city.name_en,
      orders: totals.total_orders,
      delivered: totals.delivered,
      failed: totals.failed,
      revenue: totals.revenue,
      net_profit: totals.net_profit,
      delivery_rate: totals.delivery_rate,
      avg_delivery_days: totals.avg_delivery_days,
    };
  });
  return { data: rows.sort((a, b) => b.orders - a.orders) };
}

/**
 * How long still-open orders have been sitting. Delivered and cancelled orders
 * are excluded — only work that is still outstanding can age.
 */
export function ordersAging(filters: ReportFilters) {
  const open = filterOrders(filters).filter((order) => {
    const group = dashboardGroupOfStatus(order.status);
    return group !== 'delivered' && group !== 'cancelled' && group !== 'returned';
  });

  const buckets = [
    { key: '0_2', min: 0, max: 2 },
    { key: '3_5', min: 3, max: 5 },
    { key: '6_7', min: 6, max: 7 },
    { key: 'over_7', min: 8, max: Infinity },
  ];

  const now = Date.now();
  const ageInDays = (order: MockOrder) =>
    Math.floor((now - new Date(order.date).getTime()) / DAY_MS);

  return {
    total: open.length,
    data: buckets.map((bucket) => ({
      bucket: bucket.key,
      count: open.filter((order) => {
        const age = ageInDays(order);
        return age >= bucket.min && age <= bucket.max;
      }).length,
    })),
  };
}

/**
 * Operational alerts. Every one is derived from order or stock state, so the
 * real backend can compute the same four counts.
 */
export function attentionRequired(filters: ReportFilters) {
  const orders = filterOrders(filters);
  const now = Date.now();
  const olderThan = (order: MockOrder, days: number) =>
    now - new Date(order.date).getTime() > days * DAY_MS;

  const stillOpen = (order: MockOrder) => {
    const group = dashboardGroupOfStatus(order.status);
    return group !== 'delivered' && group !== 'cancelled' && group !== 'returned';
  };

  return {
    data: [
      {
        key: 'delayed_orders',
        count: orders.filter((order) => stillOpen(order) && olderThan(order, 5)).length,
        severity: 'high',
        // Status 8 is "Waiting Confirm"; 11 is "Refund Request".
        route: '/orders',
      },
      {
        key: 'pending_confirmation',
        count: orders.filter((order) => order.status === '8').length,
        severity: 'medium',
        route: '/orders',
      },
      {
        key: 'returns_pending_receipt',
        count: orders.filter((order) => order.status === '11').length,
        severity: 'medium',
        route: '/orders',
      },
      {
        key: 'low_stock_products',
        count: PRODUCTS.filter((product) => product.status === 'low_stock').length,
        severity: 'low',
        route: '/products',
      },
    ],
  };
}

/** Stock counts straight off the catalogue. */
export function inventorySnapshot() {
  const byStatus = (status: string) =>
    PRODUCTS.filter((product) => product.status === status).length;
  return {
    total_products: PRODUCTS.length,
    in_stock: byStatus('in_stock'),
    low_stock: byStatus('low_stock'),
    out_of_stock: byStatus('out_of_stock'),
  };
}
