import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService extends BaseService {
    constructor(private http: HttpClient) {
        super();
    }

    getAllOrders(page: number = 1, limit: number = 10,statusFilter:string[],searchQuery:string): Observable<any> {
        let query=``;
        if(statusFilter.length>0){
            query+=`&statusFilter=${statusFilter.join(',')}`;
        }
        if(searchQuery){
            query+=`&searchQuery=${searchQuery}`;
        }
        return this.http.get(this.baseUrl + `orders?page=${page}&limit=${limit}${query}`);
    }
    getOrderStatusCount(status:string[]): Observable<any> {
        return this.http.get(this.baseUrl + `orders/count-by-status?status=${status.join(',')}`);
    }

    getOrderById(id:number): Observable<any> {
        return this.http.get(this.baseUrl + `orders/${id}`);
    }
    deleteOrder(id: string): Observable<any> {
        return this.http.delete(this.baseUrl + `orders/${id}`);
    }

    createOrder(order: any): Observable<any> {
        return this.http.post(this.baseUrl + 'orders', order);
    }

    updateOrder(id: string, order: any): Observable<any> {
        return this.http.put(this.baseUrl + `orders/${id}`, order);
    }
}