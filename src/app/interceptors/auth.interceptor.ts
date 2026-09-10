import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the access token to every API call and retries once through the
 * refresh endpoint when the backend answers 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  // The refresh call itself must not carry the expired token, or it would loop.
  const isRefreshCall = req.url.includes('auth/refresh');
  const authReq =
    accessToken && !isRefreshCall
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isRefreshCall) {
        return throwError(() => error);
      }
      return authService.refreshAccessToken().pipe(
        switchMap((res: { accessToken: string }) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }))
        ),
        catchError((refreshError) => {
          // The refresh token is gone too — drop the session and bubble up.
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
