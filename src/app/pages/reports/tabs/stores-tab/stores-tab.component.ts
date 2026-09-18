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
import { TranslateModule } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import {
  ReportFilters,
  PerformanceRow,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { TabCacheService } from 'src/app/services/tab-cache.service';
import { PerformanceTableComponent } from '../../shared/performance-table.component';
import { TabStatusBarComponent } from '../../shared/tab-status-bar.component';

interface StoresCache {
  store: PerformanceRow[];
}

@Component({
  selector: 'app-stores-tab',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
    PerformanceTableComponent,
    TabStatusBarComponent,
  ],
  templateUrl: './stores-tab.component.html',
})
export class StoresTabComponent implements OnInit, OnChanges {
  private reportsService = inject(ReportsService);
  private cache = inject(TabCacheService);

  @Input({ required: true }) filters!: ReportFilters;
  @Input() refreshTrigger = 0;

  readonly TAB_ID = 'stores';

  isLoading = signal(true);
  hasError = signal(false);
  lastUpdated = signal<Date | null>(null);
  store = signal<PerformanceRow[]>([]);

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
    const cached = this.cache.getWithMeta<StoresCache>(cacheKey);
    if (cached) {
      this.lastUpdated.set(new Date(cached.updatedAt));
      this.applyData(cached.data);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    this.reportsService.getPerformance(this.filters, 'store').subscribe({
      next: (res) => {
        const data: StoresCache = { store: res.data ?? [] };
        this.cache.set<StoresCache>(cacheKey, data);
        this.lastUpdated.set(new Date());
        this.applyData(data);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private applyData(data: StoresCache): void {
    this.store.set(data.store);
    this.isLoading.set(false);
  }
}
