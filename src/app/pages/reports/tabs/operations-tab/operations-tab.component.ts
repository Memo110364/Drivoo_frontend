import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import {
  ReportFilters,
  ConfirmationFunnel,
  CancellationReasonRow,
  ProductConfirmationRow,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { TabCacheService } from 'src/app/services/tab-cache.service';
import { downloadCsv } from '../../shared/csv-export';

import { TabStatusBarComponent } from '../../shared/tab-status-bar.component';

interface OperationsCache {
  funnel: ConfirmationFunnel;
  cancellationReasons: CancellationReasonRow[];
  productConfirmations: ProductConfirmationRow[];
}

@Component({
  selector: 'app-operations-tab',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    NgApexchartsModule,
    NgxSkeletonLoaderModule,
    TabStatusBarComponent,
  ],
  templateUrl: './operations-tab.component.html',
})
export class OperationsTabComponent implements OnInit, OnChanges {
  private reportsService = inject(ReportsService);
  private cache = inject(TabCacheService);
  private translate = inject(TranslateService);

  @Input({ required: true }) filters!: ReportFilters;
  @Input() refreshTrigger = 0;

  readonly TAB_ID = 'operations';

  isLoading = signal(true);
  hasError = signal(false);
  lastUpdated = signal<Date | null>(null);

  funnel = signal<ConfirmationFunnel | null>(null);
  cancellationReasons = signal<CancellationReasonRow[]>([]);
  productConfirmations = signal<ProductConfirmationRow[]>([]);

  cancellationChart: any = this.buildReasonsChart([], []);

  readonly confirmProductColumns = [
    'label', 'placed', 'confirmed', 'lost', 'confirmation_rate', 'avg_attempts',
  ];

  lostShare = computed(() => {
    const f = this.funnel();
    if (!f || !f.placed) return 0;
    return Number(((f.lost_at_confirmation / f.placed) * 100).toFixed(1));
  });

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
    const cached = this.cache.getWithMeta<OperationsCache>(cacheKey);
    if (cached) {
      this.lastUpdated.set(new Date(cached.updatedAt));
      this.applyData(cached.data);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      funnel: this.reportsService.getConfirmationFunnel(this.filters),
      cancellations: this.reportsService.getCancellationReasons(this.filters),
      productConfirmations: this.reportsService.getConfirmationByProduct(this.filters),
    }).subscribe({
      next: (res) => {
        const data: OperationsCache = {
          funnel: res.funnel,
          cancellationReasons: res.cancellations.data ?? [],
          productConfirmations: res.productConfirmations.data ?? [],
        };
        this.cache.set<OperationsCache>(cacheKey, data);
        this.lastUpdated.set(new Date());
        this.applyData(data);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private applyData(data: OperationsCache): void {
    this.funnel.set(data.funnel);
    this.cancellationReasons.set(data.cancellationReasons);
    this.productConfirmations.set(data.productConfirmations);
    this.cancellationChart = this.buildReasonsChart(
      data.cancellationReasons.map((row) =>
        this.translate.instant(`reports.cancellation_reason.${row.code}`)
      ),
      data.cancellationReasons.map((row) => row.count)
    );
    this.isLoading.set(false);
  }

  /** Green above 85%, amber 70-85, red below. */
  confirmationClass(rate: number): string {
    if (rate >= 85) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-error';
  }

  exportFunnel(): void {
    const f = this.funnel();
    if (!f) return;
    const t = (key: string) => this.translate.instant(key);
    const rows: (string | number)[][] = [
      [t('reports.funnel.placed'), f.placed],
      [t('reports.funnel.confirmed'), f.confirmed],
      [t('reports.funnel.shipped'), f.shipped],
      [t('reports.funnel.delivered'), f.delivered],
      [t('reports.funnel.lost_at_confirmation'), f.lost_at_confirmation],
      ...f.attempts.map((a) => [
        `${t('reports.funnel.attempts')}: ${a.attempts}`,
        a.orders,
      ]),
    ];
    downloadCsv(
      `drivoo-confirmation-funnel-${this.filters.from}-to-${this.filters.to}`,
      [t('reports.export.metric'), t('reports.export.value')],
      rows
    );
  }

  exportCancellationReasons(): void {
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-cancellation-reasons-${this.filters.from}-to-${this.filters.to}`,
      [t('reports.returns.reason'), t('reports.cancellations.count'), t('reports.table.share')],
      this.cancellationReasons().map((row) => [
        t(`reports.cancellation_reason.${row.code}`),
        row.count,
        `${row.percentage}%`,
      ])
    );
  }

  exportProductConfirmations(): void {
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-confirmation-by-product-${this.filters.from}-to-${this.filters.to}`,
      [
        t('reports.dimension.product'),
        t('reports.funnel.placed'),
        t('reports.funnel.confirmed'),
        t('reports.confirm_product.lost'),
        t('reports.confirm_product.rate'),
        t('reports.confirm_product.avg_attempts'),
      ],
      this.productConfirmations().map((row) => [
        row.label,
        row.placed,
        row.confirmed,
        row.lost,
        `${row.confirmation_rate}%`,
        row.avg_attempts,
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
      colors: ['#ffae1f'],
      dataLabels: { enabled: true, style: { fontSize: '11px' } },
      legend: { show: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)' },
      xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
      tooltip: { theme: 'dark' },
    };
  }
}
