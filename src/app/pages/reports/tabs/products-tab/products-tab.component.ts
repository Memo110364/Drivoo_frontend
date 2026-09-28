import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import {
  ReportFilters,
  InventorySnapshot,
  PerformanceRow,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { TabCacheService } from 'src/app/services/tab-cache.service';
import { PerformanceTableComponent } from '../../shared/performance-table.component';
import { downloadCsv } from '../../shared/csv-export';
import { TabStatusBarComponent } from '../../shared/tab-status-bar.component';

interface ProductsCache {
  inventory: InventorySnapshot;
  product: PerformanceRow[];
}

@Component({
  selector: 'app-products-tab',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
    PerformanceTableComponent,
    TabStatusBarComponent,
  ],
  templateUrl: './products-tab.component.html',
})
export class ProductsTabComponent implements OnInit, OnChanges {
  private reportsService = inject(ReportsService);
  private cache = inject(TabCacheService);
  private translate = inject(TranslateService);

  @Input({ required: true }) filters!: ReportFilters;
  @Input() refreshTrigger = 0;

  readonly TAB_ID = 'products';

  isLoading = signal(true);
  hasError = signal(false);
  lastUpdated = signal<Date | null>(null);

  inventory = signal<InventorySnapshot | null>(null);
  product = signal<PerformanceRow[]>([]);

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const filtersChanged =
      changes['filters'] &&
      !changes['filters'].firstChange &&
      (changes['filters'].previousValue?.from !== this.filters.from ||
        changes['filters'].previousValue?.to !== this.filters.to);

    const refreshed =
      changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange;

    if (filtersChanged) {
      this.load();
    } else if (refreshed) {
      this.refresh();
    }
  }

  refresh(): void {
    this.cache.invalidateTab(this.TAB_ID);
    this.load();
  }

  load(): void {
    const cacheKey = TabCacheService.key(
      this.TAB_ID,
      this.filters.from,
      this.filters.to
    );
    const cached = this.cache.getWithMeta<ProductsCache>(cacheKey);
    if (cached) {
      this.lastUpdated.set(new Date(cached.updatedAt));
      this.applyData(cached.data);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      inventory: this.reportsService.getInventory(),
      product: this.reportsService.getPerformance(this.filters, 'product'),
    }).subscribe({
      next: (res) => {
        const data: ProductsCache = {
          inventory: res.inventory,
          product: res.product.data ?? [],
        };
        this.cache.set<ProductsCache>(cacheKey, data);
        this.lastUpdated.set(new Date());
        this.applyData(data);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private applyData(data: ProductsCache): void {
    this.inventory.set(data.inventory);
    this.product.set(data.product);
    this.isLoading.set(false);
  }

  exportInventory(): void {
    const inv = this.inventory();
    if (!inv) return;
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-inventory-${this.filters.to}`,
      [t('reports.export.metric'), t('reports.export.value')],
      [
        [t('reports.inventory.total_received'), inv.total_received],
        [t('reports.inventory.total_units'), inv.total_units],
        [t('reports.inventory.units_in_transit'), inv.units_in_transit],
        [t('reports.inventory.units_sold'), inv.units_sold],
        [t('reports.inventory.total_products'), inv.total_products],
        [t('reports.inventory.in_stock'), inv.in_stock],
        [t('reports.inventory.low_stock'), inv.low_stock],
        [t('reports.inventory.out_of_stock'), inv.out_of_stock],
      ]
    );
  }
}
