import { Injectable, signal, inject } from '@angular/core';
import { OrderFullDetails, OrderList } from 'src/app/pages/orders/order-objects';
import { invoceLists } from 'src/app/pages/orders/invoiceData';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {OrderService  as OrderApiService} from '../../api/order.service';
@Injectable({
  providedIn: 'root',
})
export class OrderService {
  //private invoiceList = signal<OrderList[]>(invoceLists);
  private httpClient = inject(HttpClient);
  constructor(private api:OrderApiService ) {}

  public getInvoiceList(page: number = 1, limit: number = 10,statusFilter: string[]=[],searchQuery:string=""): Observable<any> {
    return this.api.getAllOrders(page, limit,statusFilter,searchQuery);
  }
  public getOrderStatusCount(status:string[]): Observable<any> {
    return this.api.getOrderStatusCount(status);
  }

  public getOrderById(id:number): Observable<any> {
    return this.api.getOrderById(id);
  }

  deleteInvoice(id: number): void {
    // this.invoiceList.update((invoices) =>
    //   invoices.filter((invoice) => invoice.id !== id)
    // );
  }

  public addInvoice(invoice: OrderList): void {
    // this.invoiceList.update((invoices) => [...invoices, invoice]);
  }

  public updateInvoice(id: string, invoice: any): Observable<any> {
    return this.api.updateOrder(id, invoice);
  }
}
