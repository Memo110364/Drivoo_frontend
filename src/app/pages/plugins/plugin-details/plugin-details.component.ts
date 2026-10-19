import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { MaterialModule } from 'src/app/material.module';
import { Plugin, PluginsService } from '../../../services/api/plugin.service';

@Component({
  selector: 'app-plugin-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
  ],
  templateUrl: './plugin-details.component.html',
  styleUrl: './plugin-details.component.scss',
})
export class PluginDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pluginService = inject(PluginsService);
  private snackBar = inject(MatSnackBar);
  public translate = inject(TranslateService);

  plugin = signal<Plugin | null>(null);
  isLoading = signal(true);
  isSubscribing = signal(false);
  imgError = signal(false);
  selectedTab = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPlugin(id);
    } else {
      this.router.navigate(['/plugins']);
    }
  }

  loadPlugin(id: string): void {
    this.isLoading.set(true);
    this.pluginService.getPlugin(id).subscribe({
      next: (data) => {
        if (data) {
          this.plugin.set(data);
        } else {
          // Fallback minimal object if not found
          this.plugin.set({
            id: Number(id) || 1,
            name: `إضافة رقم #${id}`,
            slug: `plugin-${id}`,
            image: '',
            is_active: false,
            description: 'تفاصيل هذه الإضافة غير متوفرة حالياً.',
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onImageError(): void {
    this.imgError.set(true);
  }

  handleSubscribe(): void {
    const p = this.plugin();
    if (!p) return;

    this.isSubscribing.set(true);
    this.pluginService.subscribePlugin(p.id).subscribe({
      next: () => {
        this.plugin.update((curr) => (curr ? { ...curr, is_active: true } : curr));
        this.isSubscribing.set(false);
        this.snackBar.open(
          this.translate.instant('plugins.subscribe_success'),
          this.translate.instant('system_messages.close'),
          { duration: 4000 }
        );
      },
      error: () => {
        this.isSubscribing.set(false);
      },
    });
  }

  handleToggleStatus(): void {
    const p = this.plugin();
    if (!p) return;

    const nextStatus = !p.is_active;
    this.pluginService.togglePluginStatus(p.id, nextStatus).subscribe({
      next: () => {
        this.plugin.update((curr) => (curr ? { ...curr, is_active: nextStatus } : curr));
        const msgKey = nextStatus ? 'plugins.subscribe_success' : 'plugins.unsubscribe_success';
        this.snackBar.open(
          this.translate.instant(msgKey),
          this.translate.instant('system_messages.close'),
          { duration: 3000 }
        );
      },
    });
  }

  getCategoryIcon(): string {
    const p = this.plugin();
    const slug = (p?.slug || '').toLowerCase();
    const cat = (p?.category || '').toLowerCase();

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
    const p = this.plugin();
    if (!p) return '';
    const cat = p.category;
    if (cat && this.translate.instant(`plugins.categories.${cat}`) !== `plugins.categories.${cat}`) {
      return this.translate.instant(`plugins.categories.${cat}`);
    }
    const slug = (p.slug || '').toLowerCase();
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

  getFeatures(): string[] {
    const p = this.plugin();
    if (p?.features && p.features.length > 0) {
      return p.features;
    }
    return [
      'تكامل فوري وآمن مع متجرك الإلكتروني',
      'تحديث البيانات والمزامنة في الوقت الفعلي',
      'لوحة تحكم وإحصائيات مفصلة لأداء الأداة',
      'دعم فني وتحديثات دورية متواصلة',
    ];
  }
}
