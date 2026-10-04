import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { ReportFilters } from './reports.service';

/**
 * The dashboard's headline figures.
 *
 * Deliberately separate from `ReportSummary`: the reports screen compares
 * dimensions within one period, while the dashboard asks "how is today going
 * against last period" — which needs `trends`, and needs profit and COD
 * figures the reports screen has no use for. One shared type would have made
 * half its fields optional and meaningless on both screens.
 */
export interface DashboardSummary {
  total_orders: number;
  shipped: number;
  delivered: number;
  returned: number;
  /** Placed but not yet shipped. */
  pending: number;
  cancelled: number;
  revenue: number;
  net_profit: number;
  cod_collected: number;
  /** Of the COD due, how much was actually collected. */
  cod_success_rate: number;
  delivery_rate: number;
  return_rate: number;
  avg_delivery_days: number;
  /**
   * Change against the preceding period of equal length. Counts and amounts
   * are percentages; rates are already percentages, so their trend is in
   * points.
   */
  trends: {
    total_orders: number;
    revenue: number;
    net_profit: number;
    cod_collected: number;
    delivered: number;
    shipped: number;
    pending: number;
    returned: number;
    delivery_rate: number;
    return_rate: number;
    avg_delivery_days: number;
    cod_success_rate: number;
  };
}

/** One aging bucket of still-open orders. */
export interface OrdersAgingBucket {
  /** `0_2 | 3_5 | 6_7 | over_7` — the i18n key is derived from this. */
  bucket: string;
  count: number;
}

export interface OrdersAging {
  total: number;
  data: OrdersAgingBucket[];
}

/**
 * Something the merchant is expected to act on. The backend decides what
 * counts and how urgent it is, so the dashboard cannot disagree with the
 * screen the alert leads to.
 */
export interface AttentionItem {
  /** `delayed_orders | pending_confirmation | returns_pending_receipt | low_stock_products` */
  key: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  /** Where the alert takes the merchant. */
  route: string;
}

/** Stock at a glance, counted in products rather than pieces. */
export interface DashboardInventory {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService extends BaseService {
  private apiUrl = this.baseUrl ;

  constructor(private http: HttpClient) {
    super();
  }


  getDashboardData(): Observable<any> {
    return this.http.get(this.apiUrl+ 'dashboard');
  }

  getCurrentOrderStatus(): Observable<any> {
    return this.http.get(this.apiUrl + 'reports/dashboard/orders-status');
  }

  getRevenueLastThirtyDays(): Observable<any> {
    return this.http.get(this.apiUrl + 'reports/dashboard/orders-last-thirty-days');
  }
  /** Shared by the three below — the same filter shape the reports screen sends. */
  private toParams(filters: ReportFilters): HttpParams {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.city_id) params = params.set('city_id', filters.city_id);
    return params;
  }

  getDashboardSummary(filters: ReportFilters): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.apiUrl + 'reports/dashboard/summary', {
      params: this.toParams(filters),
    });
  }

  getOrdersAging(filters: ReportFilters): Observable<OrdersAging> {
    return this.http.get<OrdersAging>(this.apiUrl + 'reports/dashboard/orders-aging', {
      params: this.toParams(filters),
    });
  }

  getAttentionRequired(filters: ReportFilters): Observable<{ data: AttentionItem[] }> {
    return this.http.get<{ data: AttentionItem[] }>(this.apiUrl + 'reports/dashboard/attention', {
      params: this.toParams(filters),
    });
  }

  /** Point in time: it does not move with the period filter. */
  getInventorySnapshot(): Observable<DashboardInventory> {
    return this.http.get<DashboardInventory>(this.apiUrl + 'reports/dashboard/inventory');
  }
}
