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

  login(credentials: { username: string; password: string ,rememberMe: boolean}): Observable<any> {
    return this.http.post(`${this.apiUrl}user/login`, credentials).pipe(
      tap((res: any) => {
        this.accessToken = res.accessToken;
        this.refreshToken = res.refreshToken;
        localStorage.setItem('rememberMe', credentials.rememberMe?"1":"0");
        if(credentials.rememberMe){
          localStorage.setItem('accessToken', this.accessToken!);
          localStorage.setItem('refreshToken', this.refreshToken!);
        }else{
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          sessionStorage.setItem('accessToken', this.accessToken!);
          sessionStorage.setItem('refreshToken', this.refreshToken!);
        }
        localStorage.setItem('profile', JSON.stringify(res));
      })
    );
  }

  getAccessToken(): string | null {
    console.log("accessToken: ",sessionStorage.getItem('accessToken'));
    if (localStorage.getItem('rememberMe') === '1') {
      return this.accessToken || localStorage.getItem('accessToken');
    }else{
      return this.accessToken || sessionStorage.getItem('accessToken');
    }
  }

  refreshAccessToken(): Observable<any> {
    return this.http.post(`${this.apiUrl}auth/refresh`, {
      refreshToken: this.refreshToken || (localStorage.getItem('rememberMe') === '1' ? localStorage.getItem('refreshToken') : sessionStorage.getItem('refreshToken'))
    }).pipe(
      tap((res: any) => {
        this.accessToken = res.accessToken;
        if (localStorage.getItem('rememberMe') === '1') {
          localStorage.setItem('accessToken', this.accessToken!);
        }else{
          sessionStorage.setItem('accessToken', this.accessToken!);
        }
      })
    );
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    sessionStorage.clear();
    localStorage.clear();
  }

  getUserProfile(): any {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  }

}
