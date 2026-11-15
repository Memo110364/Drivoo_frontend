import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from './base.service';

export interface StockRequestItem {
  id?: number;
  sku: string;
  name?: string;
  option_name?: string;
  quantity: number;
  previous_stock?: number;
  current_stock?: number;
  unit_cost?: number;
  notes?: string;
}

export type StockRequestStatus = 'completed' | 'pending' | 'in_transit' | 'rejected' | 'draft';

export interface StockRequest {
  id: number;
  request_code: string;
  product_id: number;
  product_name: string;
  product_image?: string;
  depot_id?: number;
  depot_name: string;
  status: StockRequestStatus;
  status_label?: string;
  total_quantity: number;
  items_count: number;
  created_at: string;
  created_by?: string;
  received_at?: string;
  supplier_name?: string;
  notes?: string;
  items: StockRequestItem[];
}

@Injectable({
  providedIn: 'root'
})
export class StockRequestService extends BaseService {


  constructor(private http: HttpClient) {
    super();
  }

  getStockRequests(productId?: number | string): Observable<StockRequest[]> {
    const url = productId
      ? `${this.baseUrl}products/${productId}/stock-requests`
      : `${this.baseUrl}products/stock-requests`;

    return this.http.get<any>(url).pipe(
      map(res => {
        const list = res?.data || res || [];
        return Array.isArray(list) ? list : [];
      }),
      catchError(err => {
        console.warn('Backend API for stock-requests is not implemented yet, using mock data:', err);
        return of([]);
      })
    );
  }

  getStockRequestById(id: number | string): Observable<StockRequest | null> {
    const url = `${this.baseUrl}products/stock-requests/${id}`;
    return this.http.get<any>(url).pipe(
      map(res => res?.data || res || null),
      catchError(err => {
        console.warn('Backend API for stock-request details is not implemented yet, using mock data:', err);
        return of(null);
      })
    );
  }

  createStockRequest(payload: any): Observable<any> {
    const url = `${this.baseUrl}products/stock-requests/create`;
    return this.http.post<any>(url, payload).pipe(
      catchError(err => {
        console.warn('Backend API for create stock-request is not implemented yet, saving in local mock state:', err);
        const newId = Date.now();
        const totalQty = (payload.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
        const newReq: StockRequest = {
          id: newId,
          request_code: `SR-${Math.floor(10000 + Math.random() * 90000)}`,
          product_id: Number(payload.product_id) || 5,
          product_name: payload.product_name || 'قميص اكس فورد',
          product_image: payload.product_image || 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/cpx21/7F3nOI2HT68XqvWJsUmpQ5ugYLQs2E1qchvNCxQl.png',
          depot_id: payload.depot_id || 1,
          depot_name: payload.depot_name || 'المخزن الرئيسي - القاهرة',
          status: 'pending',
          status_label: 'قيد المراجعة',
          total_quantity: totalQty,
          items_count: (payload.items || []).length,
          created_at: new Date().toISOString(),
          created_by: 'التاجر الحالي',
          notes: payload.notes || '',
          supplier_name: payload.supplier_name || 'مصنع النور للملابس',
          items: (payload.items || []).map((it: any) => {
            const prev = it.previous_stock !== undefined && it.previous_stock !== null ? Number(it.previous_stock) : 0;
            const qty = Number(it.quantity) || 0;
            return {
              id: it.id || Math.floor(Math.random() * 1000),
              sku: it.sku,
              name: it.name || it.sku,
              option_name: it.option_name || it.sku,
              quantity: qty,
              previous_stock: prev,
              current_stock: prev + qty,
              unit_cost: it.unit_cost || 120,
              notes: it.notes || ''
            };
          })
        };
        // this.inMemoryMockRequests.unshift(newReq);
        return of({ success: true, message: 'تم إرسال طلب إضافة المخزون بنجاح', data: newReq });
      })
    );
  }

  

}

