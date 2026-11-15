import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { MaterialModule } from 'src/app/material.module';
import { PluginCardComponent } from 'src/app/components/plugins/card/card.component';
import { Plugin, PluginsService } from '../../services/api/plugin.service';

@Component({
  selector: 'app-plugins',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
    PluginCardComponent,
  ],
  templateUrl: './plugins.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './plugins.component.scss',
})
export class PluginsComponent implements OnInit {
  private pluginService = inject(PluginsService);
  private snackBar = inject(MatSnackBar);
  public translate = inject(TranslateService);

  plugins = signal<Plugin[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  searchQuery = signal('');
  selectedStatus = signal<'all' | 'active' | 'inactive'>('all');
  selectedCategory = signal<string>('all');

  categories = [
    { key: 'all', labelKey: 'plugins.categories.all', icon: 'solar:widget-5-bold-duotone' },
    { key: 'shipping', labelKey: 'plugins.categories.shipping', icon: 'solar:box-minimalistic-bold-duotone' },
    { key: 'payments', labelKey: 'plugins.categories.payments', icon: 'solar:card-2-bold-duotone' },
    { key: 'marketing', labelKey: 'plugins.categories.marketing', icon: 'solar:chart-square-bold-duotone' },
    { key: 'communications', labelKey: 'plugins.categories.communications', icon: 'solar:chat-round-dots-bold-duotone' },
  ];

  // Stats computed from full plugins list
  stats = computed(() => {
    const all = this.plugins();
    const active = all.filter((p) => p.is_active).length;
    const inactive = all.filter((p) => !p.is_active).length;
    return {
      total: all.length,
      active,
      inactive,
    };
  });

  // Filtered list based on search, status, and category
  filteredPlugins = computed(() => {
    let list = this.plugins();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();
    const cat = this.selectedCategory();

    if (query) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.slug?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (status === 'active') {
      list = list.filter((p) => p.is_active);
    } else if (status === 'inactive') {
      list = list.filter((p) => !p.is_active);
    }

    if (cat !== 'all') {
      list = list.filter((p) => {
        const itemCat = (p.category || '').toLowerCase();
        const slug = (p.slug || '').toLowerCase();
        if (cat === 'shipping') return itemCat.includes('ship') || slug.includes('smsa') || slug.includes('aramex');
        if (cat === 'payments') return itemCat.includes('pay') || slug.includes('moyaser');
        if (cat === 'marketing') return itemCat.includes('market') || slug.includes('tiktok') || slug.includes('google');
        if (cat === 'communications') return itemCat.includes('com') || slug.includes('whatsapp');
        return itemCat === cat;
      });
    }

    return list;
  });

  ngOnInit(): void {
    this.getPlugins();
  }

  getPlugins(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.pluginService.getPlugins({ page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.plugins.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement)?.value || '';
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setStatus(status: 'all' | 'active' | 'inactive'): void {
    this.selectedStatus.set(status);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('all');
    this.selectedCategory.set('all');
  }

  handleSubscribe(plugin: Plugin): void {
    this.pluginService.subscribePlugin(plugin.slug).subscribe({
      next: () => {
        // Update local state
        this.plugins.update((list) =>
          list.map((item) => (item.slug === plugin.slug ? { ...item, is_active: true } : item))
        );
        const msg = this.translate.instant('plugins.subscribe_success');
        this.snackBar.open(`${msg}: ${plugin.name}`, this.translate.instant('system_messages.close'), {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: () => {
        this.snackBar.open('حدث خطأ أثناء الاشتراك', this.translate.instant('system_messages.close'), {
          duration: 3000,
        });
      },
    });
  }
handleUnsubscribe(plugin: Plugin): void {
    if (!plugin) return;

    this.pluginService.unsubscribePlugin(plugin.slug).subscribe({
      next: () => {
        this.plugins.update((curr) => (curr ? { ...curr, is_active: false } : curr));
        this.snackBar.open(
          this.translate.instant('plugins.unsubscribe_success'),
          this.translate.instant('system_messages.close'),
          { duration: 4000 }
        );
      },
    });
  }

}
