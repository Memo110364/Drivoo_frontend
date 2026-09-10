import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root"
})
export class BaseService {

    baseUrl = 'http://localhost:3000/api/v1/';
    
    constructor() {
        // this.baseUrl = this.baseUrl + '/';
    }
    
}