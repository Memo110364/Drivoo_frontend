import { Component, EventEmitter, Output, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { Plugin } from '../../../services/api/plugin.service';

@Component({
  selector: 'plugin-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, TranslateModule],
  templateUrl: './card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './card.component.scss',
})
export class PluginCardComponent {
  plugin = input.required<Plugin>();
  @Output() subscribe = new EventEmitter<Plugin>();
  @Output() toggleStatus = new EventEmitter<Plugin>();

  private router = inject(Router);
  public translate = inject(TranslateService);

  imgError = signal(false);
  isSubscribing = signal(false);

  onCardClick() {
    this.router.navigate(['/plugins/view', this.plugin().slug]);
  }

  onDetailsClick(event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['/plugins/view', this.plugin().slug]);
  }

  onSubscribeClick(event: MouseEvent) {
    event.stopPropagation();
    this.isSubscribing.set(true);
    this.subscribe.emit(this.plugin());
    setTimeout(() => {
      this.isSubscribing.set(false);
    }, 600);
  }

  onToggleClick(event: MouseEvent) {
    event.stopPropagation();
    this.toggleStatus.emit(this.plugin());
  }

  onImageError() {
    this.imgError.set(true);
  }

  getCategoryIcon(): string {
    const slug = (this.plugin().slug || '').toLowerCase();
    const cat = (this.plugin().category || '').toLowerCase();

    if (cat.includes('ship') || slug.includes('aramex') || slug.includes('smsa') || slug.includes('ship')) {
      return 'solar:box-minimalistic-bold-duotone';
    }
    if (cat.includes('pay') || slug.includes('moyaser') || slug.includes('pay') || slug.includes('wallet')) {
      return 'solar:card-2-bold-duotone';
    }
    if (cat.includes('market') || slug.includes('tiktok') || slug.includes('google') || slug.includes('snap')) {
      return 'solar:chart-square-bold-duotone';
    }
    if (cat.includes('com') || slug.includes('whatsapp') || slug.includes('chat') || slug.includes('sms')) {
      return 'solar:chat-round-dots-bold-duotone';
    }
    return 'solar:widget-add-bold-duotone';
  }

  getCategoryName(): string {
    const cat = this.plugin().category;
    if (cat && this.translate.instant(`plugins.categories.${cat}`) !== `plugins.categories.${cat}`) {
      return this.translate.instant(`plugins.categories.${cat}`);
    }
    const slug = (this.plugin().slug || '').toLowerCase();
    if (slug.includes('smsa') || slug.includes('aramex')) {
      return this.translate.instant('plugins.categories.shipping');
    }
    if (slug.includes('moyaser') || slug.includes('pay')) {
      return this.translate.instant('plugins.categories.payments');
    }
    if (slug.includes('tiktok') || slug.includes('google')) {
      return this.translate.instant('plugins.categories.marketing');
    }
    if (slug.includes('whatsapp')) {
      return this.translate.instant('plugins.categories.communications');
    }
    return this.translate.instant('plugins.categories.all');
  }

  getDescription(): string {
    if (this.plugin().description) {
      return this.plugin().description!;
    }
    const slug = (this.plugin().slug || '').toLowerCase();
    if (slug.includes('whatsapp')) {
      return 'إرسال إشعارات الطلبات وتحديثات الشحن المباشرة والفواتير لعملائك تلقائياً عبر واتساب.';
    }
    if (slug.includes('moyaser')) {
      return 'قبول المدفوعات بسهولة وأمان عبر بطاقات مدى، فيزا، ماستركارد، وأبل باي مع تسوية فورية.';
    }
    if (slug.includes('smsa')) {
      return 'ربط مباشر مع شبكة سمسا لإنشاء بوليصات الشحن بنقرة واحدة وتتبع الشحنات حتى باب العميل.';
    }
    if (slug.includes('aramex')) {
      return 'حلول الشحن السريع المحلي والدولي وإدارة المرتجعات بكفاءة وتكاليف شحن تفضيلية.';
    }
    return 'توسيع إمكانيات متجرك وتحسين تجربة عملائك من خلال الربط المباشر مع هذه الأداة.';
  }

  getFeatures(): string[] {
    if (this.plugin().features && this.plugin().features!.length > 0) {
      return this.plugin().features!;
    }
    return ['ربط آمن وفوري', 'تحديث البيانات تلقائياً'];
  }
}
