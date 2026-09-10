import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

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
}
