import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { ReportFilters } from './reports.service';

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

/** An operational alert the customer is expected to act on. */
export interface AttentionItem {
  /** `delayed_orders | pending_confirmation | returns_pending_receipt | low_stock_products` */
  key: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  /** Where the alert should take the user. */
  route: string;
}

export interface InventorySnapshot {
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

  /** Shared by the three calls below — same filter shape the reports screen sends. */
  private toParams(filters: ReportFilters): HttpParams {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.city_id) params = params.set('city_id', filters.city_id);
    if (filters.status_group) params = params.set('status_group', filters.status_group);
    return params;
  }

  getOrdersAging(filters: ReportFilters): Observable<OrdersAging> {
    return this.http.get<OrdersAging>(this.apiUrl + 'reports/dashboard/orders-aging', {
      params: this.toParams(filters),
    });
  }

  getAttentionRequired(filters: ReportFilters): Observable<{ data: AttentionItem[] }> {
    return this.http.get<{ data: AttentionItem[] }>(
      this.apiUrl + 'reports/dashboard/attention',
      { params: this.toParams(filters) }
    );
  }

  getInventorySnapshot(): Observable<InventorySnapshot> {
    return this.http.get<InventorySnapshot>(this.apiUrl + 'reports/dashboard/inventory');
  }
}
