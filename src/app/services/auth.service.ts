import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(private http: HttpClient) {}

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}user/login`, credentials).pipe(
      tap((res: any) => {
        this.accessToken = res.accessToken;
        this.refreshToken = res.refreshToken;
        sessionStorage.setItem('accessToken', this.accessToken!);
        sessionStorage.setItem('refreshToken', this.refreshToken!);
        localStorage.setItem('username', res.name);
      })
    );
  }

  getAccessToken(): string | null {
    return this.accessToken || sessionStorage.getItem('accessToken');
  }

  refreshAccessToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}auth/refresh`, {
      refreshToken: this.refreshToken || sessionStorage.getItem('refreshToken')
    }).pipe(
      tap((res: any) => {
        this.accessToken = res.accessToken;
        sessionStorage.setItem('accessToken', this.accessToken!);
      })
    );
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }
}
