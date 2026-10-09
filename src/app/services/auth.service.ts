import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UAParser } from 'ua-parser-js';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  parser: UAParser;
  private result: any;
  constructor(private http: HttpClient) {

    this.parser = new UAParser();
    this.result = this.parser.getResult();
    console.log(this.result);
    


  }

  login(credentials: { username: string; password: string ,rememberMe: boolean}): Observable<any> {
    const data = {
        platform:{
          type: 'web',
          name: this.result.browser.name,
          os: 'web app',
          ver: this.result.browser.version,
          id: this.result.ua,
        },
        password:credentials.password,
        email:credentials.username,
        rememberMe:credentials.rememberMe
    };
    
    return this.http.post(`${this.apiUrl}user/login`, data).pipe(
      tap((res: any) => {
        if(res.code != 200){
          throw new Error(res.message);
        }
          
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
        localStorage.setItem('profile', JSON.stringify(res.user));
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
