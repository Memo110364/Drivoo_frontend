import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

@Injectable({
    providedIn: 'root'
})
export class ProductService extends BaseService {
    constructor(private http: HttpClient) {
        super();
    }

    getAllProducts(page: number = 1, limit: number = 24, statusFilter:string[],sort_by:{field:string,direction:string}|null=null,searchQuery:string): Observable<any> {
        let query=``;
        if(statusFilter.length>0){
            query+=`&statusFilter=${statusFilter.join(',')}`;
        }
        if(searchQuery){
            query+=`&searchQuery=${searchQuery}`;
        }
        if(sort_by){
            query+=`&sort_by=${sort_by.field}&sort_by_direction=${sort_by.direction}`;
        }
        return this.http.get(this.baseUrl + `products/list?page=${page}&limit=${limit}${query}`);
    }
    getProductStatusCount(status:string[]): Observable<any> {
        return this.http.get(this.baseUrl + `products/count-by-status?status=${status.join(',')}`);
    }

    getProductById(id:number): Observable<any> {
        return this.http.get(this.baseUrl + `products/${id}`);
    }
    deleteProduct(id: string): Observable<any> {
        return this.http.delete(this.baseUrl + `products/${id}`);
    }

    createProduct(product: any): Observable<any> {
        return this.http.post(this.baseUrl + 'products', product);
    }

    updateProduct(id: string, product: any): Observable<any> {
        return this.http.put(this.baseUrl + `products/${id}`, product);
    }
}