import { HttpInterceptorFn } from '@angular/common/http';

export const headerInterceptor: HttpInterceptorFn = (req, next) => {
  req.headers.set('version',"1.0.1" );
  const newReq = req.clone({
    setHeaders: { version:"1.0.1", "accept-country":"1" }
  });
  return next(newReq);
};
