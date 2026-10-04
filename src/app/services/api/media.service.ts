
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BaseService } from "./base.service";
@Injectable({
    providedIn: 'root'
})
export class MediaService extends BaseService {
    private apiUrl = this.baseUrl;
    constructor(private http: HttpClient) { super();}
    upload(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/upload`, formData);
    }
}