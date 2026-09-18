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
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import {
  ReportFilters,
  ReturnReasonRow,
  PerformanceRow,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { TabCacheService } from 'src/app/services/tab-cache.service';
import { PerformanceTableComponent } from '../../shared/performance-table.component';
import { downloadCsv } from '../../shared/csv-export';
import { TabStatusBarComponent } from '../../shared/tab-status-bar.component';

interface ReturnsCache {
  returnReasons: ReturnReasonRow[];
  product: PerformanceRow[];
  area: PerformanceRow[];
}

@Component({
  selector: 'app-returns-tab',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    NgApexchartsModule,
    NgxSkeletonLoaderModule,
    PerformanceTableComponent,
    TabStatusBarComponent,
  ],
  templateUrl: './returns-tab.component.html',
})
export class ReturnsTabComponent implements OnInit, OnChanges {
  private reportsService = inject(ReportsService);
  private cache = inject(TabCacheService);
  private translate = inject(TranslateService);

  @Input({ required: true }) filters!: ReportFilters;
  @Input() refreshTrigger = 0;

  readonly TAB_ID = 'returns';

  isLoading = signal(true);
  hasError = signal(false);
  lastUpdated = signal<Date | null>(null);

  returnReasons = signal<ReturnReasonRow[]>([]);
  product = signal<PerformanceRow[]>([]);
  area = signal<PerformanceRow[]>([]);

  reasonsChart: any = this.buildReasonsChart([], []);

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
    const cached = this.cache.getWithMeta<ReturnsCache>(cacheKey);
    if (cached) {
      this.lastUpdated.set(new Date(cached.updatedAt));
      this.applyData(cached.data);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      reasons: this.reportsService.getReturnReasons(this.filters),
      product: this.reportsService.getPerformance(this.filters, 'product'),
      area: this.reportsService.getPerformance(this.filters, 'area'),
    }).subscribe({
      next: (res) => {
        const data: ReturnsCache = {
          returnReasons: res.reasons.data ?? [],
          product: res.product.data ?? [],
          area: res.area.data ?? [],
        };
        this.cache.set<ReturnsCache>(cacheKey, data);
        this.lastUpdated.set(new Date());
        this.applyData(data);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private applyData(data: ReturnsCache): void {
    this.returnReasons.set(data.returnReasons);
    this.product.set(data.product);
    this.area.set(data.area);
    this.reasonsChart = this.buildReasonsChart(
      data.returnReasons.map((row) =>
        this.translate.instant(`reports.return_reason.${row.code}`)
      ),
      data.returnReasons.map((row) => row.count)
    );
    this.isLoading.set(false);
  }

  exportReturnReasons(): void {
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-return-reasons-${this.filters.from}-to-${this.filters.to}`,
      [t('reports.returns.reason'), t('reports.table.returned'), t('reports.table.share')],
      this.returnReasons().map((row) => [
        t(`reports.return_reason.${row.code}`),
        row.count,
        `${row.percentage}%`,
      ])
    );
  }

  private buildReasonsChart(categories: string[], series: number[]) {
    return {
      series: [{ name: this.translate.instant('reports.table.returned'), data: series }],
      chart: {
        type: 'bar',
        fontFamily: 'inherit',
        foreColor: '#adb0bb',
        height: 300,
        toolbar: { show: false },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%' } },
      colors: ['#fa896b'],
      dataLabels: { enabled: true, style: { fontSize: '11px' } },
      legend: { show: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)' },
      xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
      tooltip: { theme: 'dark' },
    };
  }
}
