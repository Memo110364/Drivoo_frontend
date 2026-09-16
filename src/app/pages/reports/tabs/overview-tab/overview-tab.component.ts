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
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import {
  ReportFilters,
  ReportSummary,
  OrdersOverTime,
  StatusBreakdown,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { TabCacheService } from 'src/app/services/tab-cache.service';
import { CoreService } from 'src/app/services/core.service';
import { DetailedExportComponent } from '../../detailed-export/detailed-export.component';
import { downloadCsv } from '../../shared/csv-export';
import { TabStatusBarComponent } from '../../shared/tab-status-bar.component';

interface OverviewCache {
  summary: ReportSummary;
  overTime: OrdersOverTime;
  breakdown: StatusBreakdown;
}

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TranslateModule,
    NgApexchartsModule,
    NgxSkeletonLoaderModule,
    DetailedExportComponent,
    TabStatusBarComponent,
  ],
  templateUrl: './overview-tab.component.html',
})
export class OverviewTabComponent implements OnInit, OnChanges {
  private reportsService = inject(ReportsService);
  private coreService = inject(CoreService);
  private cache = inject(TabCacheService);
  private translate = inject(TranslateService);

  @Input({ required: true }) filters!: ReportFilters;
  /** Bumped by the parent whenever the user clicks "refresh". */
  @Input() refreshTrigger = 0;

  readonly TAB_ID = 'overview';

  isLoading = signal(true);
  hasError = signal(false);
  lastUpdated = signal<Date | null>(null);

  summary = signal<ReportSummary | null>(null);
  overTime = signal<OrdersOverTime | null>(null);
  breakdown = signal<StatusBreakdown | null>(null);

  exportFilters = computed<ReportFilters>(() => this.filters);

  ordersChart: any = this.buildOrdersChart([], [], [], [], []);
  statusChart: any = this.buildStatusChart([], []);

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
    const cached = this.cache.getWithMeta<OverviewCache>(cacheKey);
    if (cached) {
      this.lastUpdated.set(new Date(cached.updatedAt));
      this.applyData(cached.data);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      summary: this.reportsService.getSummary(this.filters),
      overTime: this.reportsService.getOrdersOverTime(this.filters),
      breakdown: this.reportsService.getStatusBreakdown(this.filters),
    }).subscribe({
      next: (res) => {
        this.cache.set<OverviewCache>(cacheKey, res);
        this.lastUpdated.set(new Date());
        this.applyData(res);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private applyData(res: OverviewCache): void {
    this.summary.set(res.summary);
    this.overTime.set(res.overTime);
    this.breakdown.set(res.breakdown);

    this.ordersChart = this.buildOrdersChart(
      res.overTime.labels.map((label) => this.shortDate(label)),
      res.overTime.total,
      res.overTime.shipped,
      res.overTime.delivered,
      res.overTime.returned
    );
    this.statusChart = this.buildStatusChart(
      res.breakdown.data.map((slice) =>
        this.translate.instant(`reports.status.${slice.group}`)
      ),
      res.breakdown.data.map((slice) => slice.count)
    );

    this.isLoading.set(false);
  }

  private shortDate(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString(
      this.coreService.getLanguage(),
      { day: 'numeric', month: 'short' }
    );
  }

  exportSummary(): void {
    const s = this.summary();
    if (!s) return;
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-summary-${this.filters.from}-to-${this.filters.to}`,
      [t('reports.export.metric'), t('reports.export.value')],
      [
        [t('reports.kpi.total_orders'), s.total_orders],
        [t('reports.kpi.shipped'), s.shipped],
        [t('reports.kpi.delivered'), s.delivered],
        [t('reports.kpi.returned'), s.returned],
        [t('reports.kpi.awaiting_shipment'), s.awaiting_shipment],
        [t('reports.kpi.revenue'), s.revenue],
        [t('reports.kpi.cod_collected'), s.cod_collected],
        [t('reports.table.delivery_success_rate'), `${s.delivery_success_rate}%`],
        [t('reports.table.return_rate'), `${s.return_rate}%`],
        [t('reports.table.avg_delivery_days'), s.avg_delivery_days],
      ]
    );
  }

  private buildOrdersChart(
    categories: string[],
    total: number[],
    shipped: number[],
    delivered: number[],
    returned: number[]
  ) {
    return {
      series: [
        { name: this.translate.instant('reports.series.total'), data: total },
        { name: this.translate.instant('reports.series.shipped'), data: shipped },
        { name: this.translate.instant('reports.series.delivered'), data: delivered },
        { name: this.translate.instant('reports.series.returned'), data: returned },
      ],
      chart: {
        type: 'line',
        fontFamily: 'inherit',
        foreColor: '#adb0bb',
        height: 300,
        toolbar: { show: false },
      },
      colors: ['#635bff', '#539bff', '#13deb9', '#fa896b'],
      stroke: { width: 2, curve: 'smooth' },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        markers: { size: 5 },
      },
      grid: { borderColor: 'rgba(0,0,0,0.05)' },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '11px' } },
        tickAmount: 8,
      },
      yaxis: { min: 0, forceNiceScale: true },
      tooltip: { theme: 'dark' },
    };
  }

  private buildStatusChart(labels: string[], series: number[]) {
    return {
      series,
      labels,
      chart: { type: 'donut', fontFamily: 'inherit', foreColor: '#adb0bb', height: 300 },
      colors: ['#ffae1f', '#49beff', '#539bff', '#13deb9', '#fa896b', '#7c8fac'],
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom', fontSize: '12px' },
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              total: {
                show: true,
                label: this.translate.instant('reports.kpi.total_orders'),
                fontSize: '12px',
              },
            },
          },
        },
      },
      tooltip: { theme: 'dark', fillSeriesColor: false },
    };
  }
}
