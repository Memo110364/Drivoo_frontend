import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

/** Filters shared by every reports endpoint. */
export interface ReportFilters {
  /** Inclusive `YYYY-MM-DD` bounds. */
  from: string;
  to: string;
  /** City id, or empty for every city. */
  city_id?: string;
  /** `pending | shipped | delivered | failed`, or empty for all. */
  status_group?: string;
}

export interface ReportSummary {
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
  trends: {
    total_orders: number;
    revenue: number;
    net_profit: number;
    delivery_rate: number;
  };
}

export interface OrdersOverTime {
  labels: string[];
  total: number[];
  delivered: number[];
  failed: number[];
}

export interface StatusBreakdown {
  total: number;
  data: { group: string; count: number; percentage: number }[];
}

export interface TopProduct {
  id: number;
  name: string;
  image: string;
  quantity: number;
  orders: number;
  revenue: number;
}

export interface CityPerformance {
  city_id: string;
  city_name: string;
  city_name_en: string;
  orders: number;
  delivered: number;
  failed: number;
  revenue: number;
  net_profit: number;
  delivery_rate: number;
  avg_delivery_days: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  private toParams(filters: ReportFilters, extra: Record<string, string | number> = {}): HttpParams {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.city_id) params = params.set('city_id', filters.city_id);
    if (filters.status_group) params = params.set('status_group', filters.status_group);
    for (const [key, value] of Object.entries(extra)) params = params.set(key, String(value));
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

  getTopProducts(filters: ReportFilters, limit = 8): Observable<{ data: TopProduct[] }> {
    return this.http.get<{ data: TopProduct[] }>(`${this.baseUrl}reports/top-products`, {
      params: this.toParams(filters, { limit }),
    });
  }

  getCitiesPerformance(filters: ReportFilters): Observable<{ data: CityPerformance[] }> {
    return this.http.get<{ data: CityPerformance[] }>(`${this.baseUrl}reports/cities-performance`, {
      params: this.toParams(filters),
    });
  }
}
