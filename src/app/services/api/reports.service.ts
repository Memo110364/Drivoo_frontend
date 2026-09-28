import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

/** Filters every reports endpoint accepts. */
export interface ReportFilters {
  /** Inclusive `YYYY-MM-DD` bounds. */
  from: string;
  to: string;
  /** Optional city id, to narrow any report to one city. */
  city_id?: string;
}

/**
 * Dimensions `reports/performance` can group by. Adding one here is the only
 * change a new comparison tab needs on the frontend.
 */
export type PerformanceDimension = 'carrier' | 'city' | 'area' | 'product' | 'store';

/**
 * One row of the shared comparison table.
 *
 * Counts alone mislead — 50 returns out of 1,000 orders is a healthier
 * operation than 20 out of 100 — so every endpoint returns the rates next to
 * the counts rather than leaving the frontend to divide.
 */
export interface PerformanceRow {
  /** Stable identifier of the dimension value, for drill-through later. */
  key: string;
  label: string;
  orders: number;
  shipped: number;
  delivered: number;
  returned: number;
  /** delivered / (delivered + returned) * 100 */
  delivery_success_rate: number;
  /** returned / (delivered + returned) * 100 — the complement of the above. */
  return_rate: number;
  avg_delivery_days: number;
  revenue: number;

  // Stock, present only on the `product` dimension. Counted in PIECES, unlike
  // every field above, which counts orders — one order can carry several
  // pieces. PROVISIONAL apart from `current_stock`; see
  // docs/backend-requirements.md §4.

  /** Pieces received since the product was added — the warehouse's intake. */
  total_stock?: number;
  /** Pieces on the shelf right now. Point in time, not period-filtered. */
  current_stock?: number;
  /** The product's own low-stock threshold. */
  warning_stock_number?: number;
}

export interface PerformanceReport {
  group_by: PerformanceDimension;
  data: PerformanceRow[];
}

export interface ReportSummary {
  total_orders: number;
  shipped: number;
  delivered: number;
  returned: number;
  awaiting_shipment: number;
  cancelled: number;
  revenue: number;
  cod_collected: number;
  delivery_success_rate: number;
  return_rate: number;
  avg_delivery_days: number;
}

export interface OrdersOverTime {
  labels: string[];
  total: number[];
  shipped: number[];
  delivered: number[];
  returned: number[];
}

export interface StatusBreakdown {
  total: number;
  data: { group: string; count: number; percentage: number }[];
}

/** One return reason with its share of all returns. */
export interface ReturnReasonRow {
  /** Backend enum code; the UI translates it, so the wording can change freely. */
  code: string;
  count: number;
  percentage: number;
}

/**
 * Where orders are lost between placement and shipping. `confirm_attempted`
 * already exists per order, so the attempt histogram needs no new field.
 */
export interface ConfirmationFunnel {
  placed: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  /** Orders that never got past confirmation. */
  lost_at_confirmation: number;
  /** How many calls it took: `attempts` is the call count, 0 meaning no answer yet. */
  attempts: { attempts: number; orders: number }[];
}

/**
 * The stock report the Products tab opens with.
 *
 * Every field counts PIECES except the four SKU counts at the end. The piece
 * counts reconcile: `total_received = total_units + units_in_transit +
 * units_sold`, and the three states sum to `total_products`.
 *
 * This is a point-in-time snapshot — it does not move with the period filter.
 */
export interface InventorySnapshot {
  /** Distinct SKUs in the catalogue. */
  total_products: number;
  /** Pieces received since each product was added. */
  total_received: number;
  /** Pieces on the shelf right now. */
  total_units: number;
  /** Pieces that left the warehouse and have not settled yet. */
  units_in_transit: number;
  /** Pieces that reached a customer. */
  units_sold: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
}

/** One line of a product's stock ledger. */
export interface InventoryMovementRow {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Backend enum code: `inbound`, `outbound_shipment`, `return_in`. */
  type: string;
  /** The backend's own label for the type; the UI translates `type` instead. */
  type_label: string;
  /** Pieces — positive onto the shelf, negative off it. */
  quantity: number;
  /** Running balance after this movement. */
  balance: number;
  /** Purchase order, shipment or return reference. */
  reference: string;
}

/** A product's stock ledger, as the drill-down page reads it. */
export interface InventoryMovementReport {
  product: {
    id: string;
    label: string;
    current_stock: number;
    total_stock: number;
    units_in_transit: number;
    units_sold: number;
    warning_stock_number: number;
  };
  data: InventoryMovementRow[];
}

/** Why orders were cancelled before they ever shipped. */
export interface CancellationReasonRow {
  /** Backend enum code; the UI translates it. */
  code: string;
  count: number;
  percentage: number;
}

/** Confirmation quality for one product. */
export interface ProductConfirmationRow {
  id: string;
  label: string;
  placed: number;
  confirmed: number;
  lost: number;
  confirmation_rate: number;
  /** Average calls before the customer answered. */
  avg_attempts: number;
}

/** One order, as the detail report lists it. */
export interface OrderRow {
  id: number;
  order_code: string;
  /** ISO timestamp. */
  date: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  area: string;
  store: string;
  carrier: string;
  items_count: number;
  /** The group the report filters by: pending | confirmed | in_shipping | delivered | returned | cancelled. */
  status: string;
  /** The backend's own numeric status, kept so a row can be traced back. */
  status_code: string;
  goods_total: number;
  shipping_cost: number;
  /** What the customer pays on delivery. */
  total: number;
}

/** Server-side paging, because this report lists every order in the period. */
export interface OrdersPage {
  page: number;
  limit: number;
  total: number;
  data: OrderRow[];
}

export interface OrdersQuery extends ReportFilters {
  page?: number;
  limit?: number;
  /** One of the status groups, or empty for every status. */
  status?: string;
  /** Matches order code, customer name or phone. */
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  private toParams(filters: ReportFilters, extra: Record<string, string> = {}): HttpParams {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.city_id) params = params.set('city_id', filters.city_id);
    for (const [key, value] of Object.entries(extra)) params = params.set(key, value);
    return params;
  }

  getSummary(filters: ReportFilters): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.baseUrl}reports/summary`, {
      params: this.toParams(filters),
    });
  }

  getOrdersOverTime(filters: ReportFilters): Observable<OrdersOverTime> {
    return this.http.get<OrdersOverTime>(`${this.baseUrl}reports/orders-over-time`, {
      params: this.toParams(filters),
    });
  }

  getStatusBreakdown(filters: ReportFilters): Observable<StatusBreakdown> {
    return this.http.get<StatusBreakdown>(`${this.baseUrl}reports/status-breakdown`, {
      params: this.toParams(filters),
    });
  }

  /**
   * One endpoint behind every comparison tab — carrier, city, area, product,
   * store. The dimension is a path segment rather than a query parameter so the
   * same URLs can be served by a plain static host for the published demo.
   */
  getPerformance(
    filters: ReportFilters,
    groupBy: PerformanceDimension
  ): Observable<PerformanceReport> {
    return this.http.get<PerformanceReport>(`${this.baseUrl}reports/performance/${groupBy}`, {
      params: this.toParams(filters),
    });
  }

  getReturnReasons(filters: ReportFilters): Observable<{ total: number; data: ReturnReasonRow[] }> {
    return this.http.get<{ total: number; data: ReturnReasonRow[] }>(
      `${this.baseUrl}reports/returns-by-reason`,
      { params: this.toParams(filters) }
    );
  }

  /**
   * Every order in the period, at row level. Paged on the server because a busy
   * merchant's period runs to thousands of rows; pass a `limit` of `total` to
   * pull the whole set for an export.
   */
  getOrders(query: OrdersQuery): Observable<OrdersPage> {
    const extra: Record<string, string> = {};
    if (query.page) extra['page'] = String(query.page);
    if (query.limit) extra['limit'] = String(query.limit);
    if (query.status) extra['status'] = query.status;
    if (query.search) extra['search'] = query.search;
    return this.http.get<OrdersPage>(`${this.baseUrl}reports/orders`, {
      params: this.toParams(query, extra),
    });
  }

  getInventory(): Observable<InventorySnapshot> {
    return this.http.get<InventorySnapshot>(`${this.baseUrl}reports/inventory`);
  }

  /**
   * One product's stock ledger. Not period-filtered: a balance only makes sense
   * read from the beginning, so the page shows the product's whole history and
   * the period filter stays on the report it belongs to.
   */
  getInventoryMovements(productId: string): Observable<InventoryMovementReport> {
    return this.http.get<InventoryMovementReport>(
      `${this.baseUrl}reports/inventory-movements/${productId}`
    );
  }

  getCancellationReasons(
    filters: ReportFilters
  ): Observable<{ total: number; data: CancellationReasonRow[] }> {
    return this.http.get<{ total: number; data: CancellationReasonRow[] }>(
      `${this.baseUrl}reports/cancellation-reasons`,
      { params: this.toParams(filters) }
    );
  }

  /** Surfaces a product whose orders keep dying on the confirmation call. */
  getConfirmationByProduct(
    filters: ReportFilters
  ): Observable<{ data: ProductConfirmationRow[] }> {
    return this.http.get<{ data: ProductConfirmationRow[] }>(
      `${this.baseUrl}reports/confirmation-by-product`,
      { params: this.toParams(filters) }
    );
  }

  getConfirmationFunnel(filters: ReportFilters): Observable<ConfirmationFunnel> {
    return this.http.get<ConfirmationFunnel>(`${this.baseUrl}reports/confirmation-funnel`, {
      params: this.toParams(filters),
    });
  }
}
