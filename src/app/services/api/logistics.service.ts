import {Injectable, signal, inject} from '@angular/core';
import {OrderList} from 'src/app/pages/orders/order-objects';
import {invoceLists} from 'src/app/pages/orders/invoiceData';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {BaseService} from './base.service';
@Injectable({
  providedIn: 'root',
})
export class LogisticsService extends BaseService {
  private apiUrl = this.baseUrl;
  constructor(private http: HttpClient) {
    super();
  }


  getCities(): Observable<any> {
    return this.http.get(this.apiUrl + 'logistics/cities');
  }
}
