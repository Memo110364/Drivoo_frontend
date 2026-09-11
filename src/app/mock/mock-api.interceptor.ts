/**
 * In-app mock backend, enabled by `environment.useMockApi`.
 *
 * It answers the same routes the Mockoon `Moyaser` environment serves (plus the
 * `reports/*` routes the reports screen needs), so the published demo link works
 * with no server behind it. When the flag is off the interceptor is a no-op.
 */
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CITIES, ORDERS, PRODUCTS, STATUS_GROUPS, TODAY, dayKey, statusCounts } from './mock-data';
import {
  ReportFilters,
  attentionRequired,
  citiesPerformance,
  inventorySnapshot,
  ordersAging,
  ordersOverTime,
  reportSummary,
  statusBreakdown,
  topProducts,
} from './mock-reports';

const DEMO_USER = { username: 'admin', password: '123456789' };

function ok(body: unknown): Observable<HttpResponse<unknown>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(environment.mockLatency));
}

function fail(status: number, body: unknown): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: body })).pipe(
    delay(environment.mockLatency)
  ) as Observable<never>;
}

/** Strips the origin and the `api/v1/` prefix so routes can be matched by name. */
function routeOf(url: string): string {
  const path = url.split('?')[0];
  const index = path.indexOf('/api/v1/');
  const withoutPrefix = index >= 0 ? path.slice(index + '/api/v1/'.length) : path;
  return withoutPrefix.replace(/^\/+|\/+$/g, '');
}

function paginate<T>(rows: T[], page: number, limit: number): T[] {
  const start = (Math.max(1, page) - 1) * limit;
  return rows.slice(start, start + limit);
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  // Let real traffic (i18n files, assets, anything outside the API) through untouched.
  if (!environment.useMockApi || !req.url.includes('/api/v1/')) {
    return next(req);
  }

  const route = routeOf(req.url);
  const params = req.params;
  const page = Number(params.get('page') ?? 1) || 1;
  const limit = Number(params.get('limit') ?? 10) || 10;
  const searchQuery = (params.get('searchQuery') ?? '').trim().toLowerCase();
  const statusFilter = (params.get('statusFilter') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const reportFilters: ReportFilters = {
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    city_id: params.get('city_id') ?? undefined,
    status_group: params.get('status_group') ?? undefined,
  };

  // ---- auth ----------------------------------------------------------------
  if (route === 'user/login' && req.method === 'POST') {
    const body = (req.body ?? {}) as { username?: string; password?: string };
    if (body.username === DEMO_USER.username && body.password === DEMO_USER.password) {
      return ok({
        id: '123324',
        name: 'ahmed',
        email: 'ahmed.safar@gmail.com',
        phone: '01000000000',
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
      });
    }
    return fail(401, { message: 'unauthorized' });
  }

  if (route === 'auth/refresh' && req.method === 'POST') {
    return ok({ accessToken: 'demo-access-token' });
  }

  // ---- dashboard -----------------------------------------------------------
  if (route === 'dashboard') {
    const summary = reportSummary({
      from: dayKey(new Date(TODAY.getTime() - 29 * 86400000)),
      to: dayKey(TODAY),
    });
    return ok({
      total_orders: summary.total_orders,
      revenue: summary.revenue,
      delivery_rate: `${summary.delivery_rate}%`,
      return_rate: `${summary.return_rate}%`,
      average_delivery: summary.avg_delivery_days,
      net_profit: summary.net_profit,
    });
  }

  if (route === 'reports/dashboard/orders-status') {
    const orders = ORDERS;
    const buckets = [
      { name: 'pending', codes: STATUS_GROUPS['pending'] },
      { name: 'in_shipping', codes: STATUS_GROUPS['shipped'] },
      { name: 'delivered', codes: STATUS_GROUPS['delivered'] },
      { name: 'returned', codes: STATUS_GROUPS['failed'] },
    ];
    const status = buckets.map((bucket) => ({
      name: bucket.name,
      value: String(orders.filter((order) => bucket.codes.includes(order.status)).length),
    }));
    return ok({ status, total: String(orders.length) });
  }

  if (route === 'reports/dashboard/orders-last-thirty-days') {
    const series = ordersOverTime({
      from: dayKey(new Date(TODAY.getTime() - 29 * 86400000)),
      to: dayKey(TODAY),
    });
    return ok({ orders: series.total });
  }

  // ---- reports -------------------------------------------------------------
  if (route === 'reports/summary') return ok(reportSummary(reportFilters));
  if (route === 'reports/orders-over-time') return ok(ordersOverTime(reportFilters));
  if (route === 'reports/status-breakdown') return ok(statusBreakdown(reportFilters));
  if (route === 'reports/top-products') {
    return ok(topProducts(reportFilters, Number(params.get('limit') ?? 8) || 8));
  }
  if (route === 'reports/cities-performance') return ok(citiesPerformance(reportFilters));

  // ---- dashboard-only reports ----------------------------------------------
  if (route === 'reports/dashboard/orders-aging') return ok(ordersAging(reportFilters));
  if (route === 'reports/dashboard/attention') return ok(attentionRequired(reportFilters));
  if (route === 'reports/dashboard/inventory') return ok(inventorySnapshot());

  // ---- logistics -----------------------------------------------------------
  if (route === 'logistics/cities') {
    return ok({ status: 200, message: 'تم جلب المدن والمناطق بنجاح', data: CITIES });
  }

  // ---- orders --------------------------------------------------------------
  if (route === 'orders/count-by-status') {
    return ok(statusCounts());
  }

  if (route === 'orders' && req.method === 'GET') {
    let rows = ORDERS;
    if (statusFilter.length) {
      rows = rows.filter((order) => statusFilter.includes(order.status));
    }
    if (searchQuery) {
      rows = rows.filter(
        (order) =>
          order.Name.toLowerCase().includes(searchQuery) ||
          order.Phone.includes(searchQuery) ||
          order.order_code.toLowerCase().includes(searchQuery) ||
          String(order.id).includes(searchQuery)
      );
    }
    return ok({
      draw: page,
      recordsTotal: rows.length,
      recordsFiltered: rows.length,
      data: paginate(rows, page, limit),
    });
  }

  if (route === 'orders' && req.method === 'POST') {
    return ok({ status: 200, message: 'تم إنشاء الطلب بنجاح', data: { id: 1099999 } });
  }

  const orderMatch = route.match(/^orders\/(\d+)$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    if (req.method === 'DELETE') {
      return ok({ status: 200, message: 'تم حذف الطلب بنجاح' });
    }
    const order = ORDERS.find((candidate) => candidate.id === id) ?? ORDERS[0];
    if (req.method === 'PUT') {
      return ok({ status: 200, message: 'تم تعديل الطلب بنجاح', data: order });
    }
    return ok({
      status: 200,
      message: 'success',
      data: { ...order, is_editable: true, is_cancelable: true, is_reactiveable: false, status_text: order.status },
    });
  }

  // ---- products ------------------------------------------------------------
  if (route === 'products/count-by-status') {
    return ok({
      in_stock: PRODUCTS.filter((product) => product.status === 'in_stock').length,
      low_stock: PRODUCTS.filter((product) => product.status === 'low_stock').length,
      out_of_stock: PRODUCTS.filter((product) => product.status === 'out_of_stock').length,
      all: PRODUCTS.length,
    });
  }

  if (route === 'products/list') {
    let rows = [...PRODUCTS];
    if (statusFilter.length) rows = rows.filter((product) => statusFilter.includes(product.status));
    if (searchQuery) rows = rows.filter((product) => product.name.toLowerCase().includes(searchQuery));

    const sortField = params.get('sort_by');
    if (sortField) {
      const direction = params.get('sort_by_direction') === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const left = (a as unknown as Record<string, number>)[sortField] ?? 0;
        const right = (b as unknown as Record<string, number>)[sortField] ?? 0;
        return left === right ? 0 : left > right ? direction : -direction;
      });
    }

    return ok({
      success: true,
      message: 'success',
      data: paginate(rows, page, limit),
      pagination: {
        current_page: page,
        total_pages: Math.max(1, Math.ceil(rows.length / limit)),
        per_page: limit,
        total_items: rows.length,
      },
    });
  }

  const productMatch = route.match(/^products\/(\d+)$/);
  if (productMatch) {
    const id = Number(productMatch[1]);
    if (req.method === 'DELETE') return ok({ success: true, message: 'تم حذف المنتج بنجاح' });
    const product = PRODUCTS.find((candidate) => candidate.id === id) ?? PRODUCTS[0];
    return ok({ success: true, message: 'success', data: product });
  }

  if (route === 'products' && (req.method === 'POST' || req.method === 'PUT')) {
    return ok({ success: true, message: 'تم الحفظ بنجاح', data: req.body });
  }

  // Anything the demo does not cover should be loud rather than silently empty.
  console.warn(`[mock-api] no handler for ${req.method} ${route}`);
  return fail(404, { message: `Mock endpoint not implemented: ${req.method} /${route}` });
};
