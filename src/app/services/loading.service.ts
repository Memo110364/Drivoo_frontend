import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // عداد لتتبع عدد طلبات الـ HTTP المفتوحة حالياً
  private activeRequests = 0;
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  show() {
    // إذا كان هذا هو الطلب الأول، نظهر المؤشر فوراً
    if (this.activeRequests === 0) {
      this.loadingSubject.next(true);
    }
    this.activeRequests++; // زيادة العداد
  }

  hide() {
    this.activeRequests--; // إنقاص العداد عند انتهاء الطلب
    
    // إذا أصبحت القيمة صفر أو أقل، هذا يعني أن كل الطلبات انتهت ونخفي المؤشر بأمان
    if (this.activeRequests <= 0) {
      this.activeRequests = 0; // لضمان عدم نزول العداد تحت الصفر في الحالات الغريبة
      this.loadingSubject.next(false);
    }
  }
}
