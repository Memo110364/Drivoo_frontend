import { inject, Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {Router} from '@angular/router';
/*
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = this.authService.getAccessToken()??"---";
    console.log("access token: ",accessToken);
    
    let authReq = req;
    if (accessToken) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError(err => {
        if (err.status === 401) {
          return this.authService.refreshAccessToken().pipe(
            switchMap((res: any) => {
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.accessToken}` }
              });
              return next.handle(newReq);
            })
          );
        }
        return throwError(() => err);
      })
    );
  }
}
*/

export const AuthInterceptor : HttpInterceptorFn = (req, next) => {
      const authService = inject(AuthService)
      const router = inject(Router)
    
      const accessToken = authService.getAccessToken() ;
    
      let authReq = req;
      if (accessToken) {
        authReq = req.clone({
          setHeaders: { Authorization: `Bearer ${accessToken}` }
        });
      }
    
      return next(authReq).pipe(
        catchError(err => {
          if (err.status === 401) {
            console.log("auth request: ", req);
    
            // نوقف أي طلبات أخرى قد تكون نشطة لنفس الـ token
            //  authService.cancelPendingRequests();
    
            // لو الـ access token انتهى، نجدد باستخدام refresh token
            return authService.refreshAccessToken().pipe(
              switchMap((res: any) => {
                const newReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${res.accessToken}` }
                });
                return next(newReq);
              }),
              catchError(refreshErr => {
                // لو فشل تحديث الـ token → خروج
                authService.logout();
                router.navigate(['/authentication/login']);
                return throwError(() => refreshErr);
              })
            );
          }
          return throwError(() => err);
        })
      );
    }
    