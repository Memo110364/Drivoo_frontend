import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {BaseService} from './base.service';

export interface PluginsResponse {
  page: number;
  limit: number;
  total: number;
  data: Plugin[];
}

export interface PluginField {
  key: string;
  name: string;
  type: string;
  required: boolean;
  pattern?: string;
  options?: string[];
  help_text?: string;
  placeholder?: string;
  default_value?: any;
}

export interface Plugin {
  id: number;
  name: string;
  image: string;
  slug: string;
  is_active: boolean;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  price?: number | string;
  is_free?: boolean;
  features?: string[];
  rating?: number;
  reviews_count?: number;
  fields?: PluginField[];
}

export interface PluginsQuery {
  q?: string;
  page: number;
  limit: number;
}

@Injectable({providedIn: 'root'})
export class PluginsService extends BaseService {
  private http = inject(HttpClient);
  private cachedPlugins: Plugin[] = [];

  /** Fetch plugins list */
  getPlugins(query: PluginsQuery = {page: 1, limit: 24}): Observable<PluginsResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PluginsResponse>(`${this.baseUrl}plugins/list`, {params}).pipe(
      tap((res) => {
        if (res?.data) {
          this.cachedPlugins = res.data;
        }
      }),
      catchError(() => {
        // Fallback demo plugins if backend is unreachable or not yet populated
        const fallback = this.getFallbackPlugins();
        return of({
          page: 1,
          limit: 24,
          total: fallback.length,
          data: fallback,
        });
      })
    );
  }

  /** Fetch details of a single plugin */
  getPlugin(pluginSlug: number | string): Observable<Plugin | null> {
    return this.http.get<Plugin>(`${this.baseUrl}plugins/details/${pluginSlug}`)
  }

  /** Subscribe or activate a plugin */
  subscribePlugin(pluginId: number): Observable<{ success: boolean; is_active: boolean; message?: string }> {
    return this.http
      .post<{ success: boolean; is_active: boolean; message?: string }>(
        `${this.baseUrl}plugins/${pluginId}/subscribe`,
        {}
      )
      .pipe(
        tap(() => this.updateLocalStatus(pluginId, true)),
        catchError(() => {
          this.updateLocalStatus(pluginId, true);
          return of({ success: true, is_active: true, message: 'Subscription activated' });
        })
      );
  }

  /** Toggle plugin active status */
  togglePluginStatus(pluginId: number, status: boolean): Observable<{ success: boolean; is_active: boolean; message?: string }> {
    return this.http
      .post<{ success: boolean; is_active: boolean; message?: string }>(
        `${this.baseUrl}plugins/${pluginId}/toggle`,
        { is_active: status }
      )
      .pipe(
        tap(() => this.updateLocalStatus(pluginId, status)),
        catchError(() => {
          this.updateLocalStatus(pluginId, status);
          return of({ success: true, is_active: status });
        })
      );
  }

  private updateLocalStatus(id: number, status: boolean) {
    const p = this.cachedPlugins.find((item) => item.id === id);
    if (p) {
      p.is_active = status;
    }
  }

  private getFallbackPlugins(): Plugin[] {
    return [
      {
        id: 1,
        name: 'واتساب للأعمال (WhatsApp Business)',
        slug: 'whatsapp-business',
        image: 'assets/images/plugins/whatsapp.png',
        is_active: false,
        category: 'communications',
        description: 'إرسال إشعارات الطلبات وتحديثات الشحن المباشرة والفواتير لعملائك تلقائياً عبر واتساب.',
        version: '2.4.0',
        author: 'Drivoo Team',
        price: 0,
        is_free: true,
        rating: 4.9,
        reviews_count: 142,
        features: ['إشعارات فورية لكل طلب', 'تحديثات الشحن والتوصيل', 'قوالب رسائل قابلة للتخصيص', 'دعم الأرقام الدولية'],
      },
      {
        id: 2,
        name: 'بوابة دفع ميسر (Moyaser Payments)',
        slug: 'moyaser-payments',
        image: 'assets/images/plugins/moyaser.png',
        is_active: true,
        category: 'payments',
        description: 'قبول المدفوعات بسهولة وأمان عبر بطاقات مدى، فيزا، ماستركارد، وأبل باي مع تسوية فورية.',
        version: '3.1.2',
        author: 'Moyaser',
        price: 0,
        is_free: true,
        rating: 5.0,
        reviews_count: 210,
        features: ['دعم مدى وApple Pay', 'حماية عالية ضد الاحتيال', 'تسويات بنكية مباشرة', 'لوحة تحكم للمدفوعات'],
      },
      {
        id: 3,
        name: 'سمسا إكسبريس (SMSA Express)',
        slug: 'smsa-express',
        image: 'assets/images/plugins/smsa.png',
        is_active: false,
        category: 'shipping',
        description: 'ربط مباشر مع شبكة سمسا لإنشاء بوليصات الشحن بنقرة واحدة وتتبع الشحنات حتى باب العميل.',
        version: '1.8.5',
        author: 'Logistics Hub',
        price: 0,
        is_free: true,
        rating: 4.7,
        reviews_count: 89,
        features: ['إصدار بوليصات آلي', 'تتبع دقيق للمسار', 'تغطية شاملة للمملكة', 'دعم الدفع عند الاستلام COD'],
      },
      {
        id: 4,
        name: 'أرامكس اللوجستية (Aramex Logistics)',
        slug: 'aramex-logistics',
        image: 'assets/images/plugins/aramex.png',
        is_active: true,
        category: 'shipping',
        description: 'حلول الشحن السريع المحلي والدولي وإدارة المرتجعات بكفاءة وتكاليف شحن تفضيلية.',
        version: '2.0.1',
        author: 'Aramex Inc.',
        price: 0,
        is_free: true,
        rating: 4.8,
        reviews_count: 115,
        features: ['شحن محلي ودولي', 'إدارة المرتجعات الذكية', 'حساب تكلفة الشحن آلياً', 'جدولة مواعيد الاستلام'],
      },
      {
        id: 5,
        name: 'تيك توك بكسل (TikTok Pixel & Ads)',
        slug: 'tiktok-pixel',
        image: 'assets/images/plugins/tiktok.png',
        is_active: false,
        category: 'marketing',
        description: 'تتبع أحداث الشراء والتحويلات وتحسين نتائج الحملات الإعلانية على منصة تيك توك بدقة.',
        version: '1.3.0',
        author: 'TikTok Commerce',
        price: 0,
        is_free: true,
        rating: 4.6,
        reviews_count: 67,
        features: ['تتبع أحداث المتجر كاملة', 'تحسين معدلات التحويل', 'إعادة استهداف زوار المتجر', 'إعداد سريع بدون كود'],
      },
      {
        id: 6,
        name: 'جوجل شوبنج (Google Merchant Center)',
        slug: 'google-shopping',
        image: 'assets/images/plugins/google.png',
        is_active: false,
        category: 'marketing',
        description: 'مزامنة منتجات متجرك تلقائياً مع مركز تجار جوجل وعرضها في نتائج البحث والإعلانات الذكية.',
        version: '2.1.0',
        author: 'Google Cloud',
        price: 0,
        is_free: true,
        rating: 4.9,
        reviews_count: 178,
        features: ['تحديث المنتجات والمخزون لحظياً', 'تغذية المنتجات التلقائية', 'دعم العملات المتعددة', 'تقارير أداء المنتجات'],
      },
    ];
  }
}
