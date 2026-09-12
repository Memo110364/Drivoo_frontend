import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import { CoreService } from 'src/app/services/core.service';
import {
  ConfirmationFunnel,
  OrdersOverTime,
  PerformanceDimension,
  PerformanceRow,
  ReportFilters,
  ReportSummary,
  ReportsService,
  ReturnReasonRow,
  StatusBreakdown,
} from 'src/app/services/api/reports.service';
import { PerformanceTableComponent } from './shared/performance-table.component';
import { OrdersReportComponent } from './orders-report/orders-report.component';
import { downloadCsv } from './shared/csv-export';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` in local time — the format every reports endpoint expects. */
function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TranslateModule,
    NgApexchartsModule,
    NgxSkeletonLoaderModule,
    PerformanceTableComponent,
    OrdersReportComponent,
  ],
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private coreService = inject(CoreService);
  private translate = inject(TranslateService);
  private dateAdapter = inject(DateAdapter);

  isLoading = signal(true);
  hasError = signal(false);

  summary = signal<ReportSummary | null>(null);
  overTime = signal<OrdersOverTime | null>(null);
  breakdown = signal<StatusBreakdown | null>(null);
  returnReasons = signal<ReturnReasonRow[]>([]);
  funnel = signal<ConfirmationFunnel | null>(null);

  /** One bucket of rows per comparison dimension, all from `reports/performance`. */
  performance = signal<Record<PerformanceDimension, PerformanceRow[]>>({
    carrier: [],
    city: [],
    area: [],
    product: [],
    store: [],
  });

  readonly presets = [
    { key: 'last_7_days', days: 7 },
    { key: 'last_30_days', days: 30 },
    { key: 'last_90_days', days: 90 },
  ];
  activePreset = signal<string>('last_30_days');

  fromDate = signal<Date>(new Date(Date.now() - 29 * DAY_MS));
  toDate = signal<Date>(new Date());
  from = computed(() => toApiDate(this.fromDate()));
  to = computed(() => toApiDate(this.toDate()));

  ordersChart: any = this.buildOrdersChart([], [], [], [], []);
  statusChart: any = this.buildStatusChart([], []);
  reasonsChart: any = this.buildReasonsChart([], []);

  ngOnInit(): void {
    this.dateAdapter.setLocale(this.coreService.getLanguage() === 'ar' ? 'ar-EG' : 'en-GB');
    this.load();
  }

  applyPreset(preset: { key: string; days: number }): void {
    this.activePreset.set(preset.key);
    this.toDate.set(new Date());
    this.fromDate.set(new Date(Date.now() - (preset.days - 1) * DAY_MS));
    this.load();
  }

  onDateChange(which: 'from' | 'to', value: Date | null): void {
    if (!value) return;
    this.activePreset.set('');
    (which === 'from' ? this.fromDate : this.toDate).set(value);
    this.load();
  }

  private get filters(): ReportFilters {
    return { from: this.from(), to: this.to() };
  }

  /** Handed to the orders tab, which paginates and filters on its own. */
  orderFilters = computed<ReportFilters>(() => ({ from: this.from(), to: this.to() }));

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const filters = this.filters;

    forkJoin({
      summary: this.reportsService.getSummary(filters),
      overTime: this.reportsService.getOrdersOverTime(filters),
      breakdown: this.reportsService.getStatusBreakdown(filters),
      reasons: this.reportsService.getReturnReasons(filters),
      funnel: this.reportsService.getConfirmationFunnel(filters),
      carrier: this.reportsService.getPerformance(filters, 'carrier'),
      city: this.reportsService.getPerformance(filters, 'city'),
      area: this.reportsService.getPerformance(filters, 'area'),
      product: this.reportsService.getPerformance(filters, 'product'),
      store: this.reportsService.getPerformance(filters, 'store'),
    }).subscribe({
      next: (res) => {
        this.summary.set(res.summary);
        this.overTime.set(res.overTime);
        this.breakdown.set(res.breakdown);
        this.returnReasons.set(res.reasons.data ?? []);
        this.funnel.set(res.funnel);
        this.performance.set({
          carrier: res.carrier.data ?? [],
          city: res.city.data ?? [],
          area: res.area.data ?? [],
          product: res.product.data ?? [],
          store: res.store.data ?? [],
        });

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
        this.reasonsChart = this.buildReasonsChart(
          (res.reasons.data ?? []).map((row) =>
            this.translate.instant(`reports.return_reason.${row.code}`)
          ),
          (res.reasons.data ?? []).map((row) => row.count)
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  rows(dimension: PerformanceDimension): PerformanceRow[] {
    return this.performance()[dimension];
  }

  /** Share of confirmed orders that never shipped, used as the funnel's loss line. */
  lostShare = computed(() => {
    const f = this.funnel();
    if (!f || !f.placed) return 0;
    return Number(((f.lost_at_confirmation / f.placed) * 100).toFixed(1));
  });

  private shortDate(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString(this.coreService.getLanguage(), {
      day: 'numeric',
      month: 'short',
    });
  }

  exportReturnReasons(): void {
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-return-reasons-${this.from()}-to-${this.to()}`,
      [t('reports.returns.reason'), t('reports.table.returned'), t('reports.table.share')],
      this.returnReasons().map((row) => [
        t(`reports.return_reason.${row.code}`),
        row.count,
        `${row.percentage}%`,
      ])
    );
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
      `drivoo-confirmation-funnel-${this.from()}-to-${this.to()}`,
      [t('reports.export.metric'), t('reports.export.value')],
      rows
    );
  }

  exportSummary(): void {
    const s = this.summary();
    if (!s) return;
    const t = (key: string) => this.translate.instant(key);
    downloadCsv(
      `drivoo-summary-${this.from()}-to-${this.to()}`,
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
        // A 90-day range would otherwise print an unreadable wall of labels.
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
      // Horizontal bars keep long Arabic reason labels readable.
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
