/**
 * Report aggregations for the demo backend.
 *
 * These functions define the payload contract of the `reports/*` endpoints, so
 * the real backend can be written against them one-for-one.
 */
import { CITIES, MockOrder, ORDERS, dayKey, groupOfStatus } from './mock-data';

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
    goods += order.goods_total;
    shipping += order.shipping_cost;
    commission += order.commission;
    profit += order.net_profit;
    if (group === 'delivered') {
      revenue += order.goods_total + order.shipping_cost;
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
      delivery_rate: Number((current.delivery_rate - previous.delivery_rate).toFixed(1)),
    },
  };
}

/** Daily series: every day in range, total / delivered / failed. */
export function ordersOverTime(filters: ReportFilters) {
  const orders = filterOrders(filters);
  const from = parseDay(filters.from);
  const to = parseDay(filters.to);
  if (!from || !to) return { labels: [], total: [], delivered: [], failed: [] };

  const buckets = new Map<string, { total: number; delivered: number; failed: number }>();
  for (let day = new Date(from); day <= to; day = new Date(day.getTime() + DAY_MS)) {
    buckets.set(dayKey(day), { total: 0, delivered: 0, failed: 0 });
  }
  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.date));
    if (!bucket) continue;
    bucket.total += 1;
    const group = groupOfStatus(order.status);
    if (group === 'delivered') bucket.delivered += 1;
    if (group === 'failed') bucket.failed += 1;
  }

  const labels = [...buckets.keys()];
  return {
    labels,
    total: labels.map((label) => buckets.get(label)!.total),
    delivered: labels.map((label) => buckets.get(label)!.delivered),
    failed: labels.map((label) => buckets.get(label)!.failed),
  };
}

/** Donut source: how the orders split across the four status groups. */
export function statusBreakdown(filters: ReportFilters) {
  const orders = filterOrders(filters);
  const groups = ['delivered', 'shipped', 'pending', 'failed'];
  const counts = groups.map(
    (group) => orders.filter((order) => groupOfStatus(order.status) === group).length
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
