import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DateAdapter } from '@angular/material/core';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import { AppCardsComponent } from 'src/app/components/cards/cards.component';
import { CoreService } from 'src/app/services/core.service';
import {
  AttentionItem,
  DashboardService,
  InventorySnapshot,
  OrdersAging,
} from 'src/app/services/api/dashboar.service';
import {
  OrdersOverTime,
  ReportFilters,
  ReportSummary,
  ReportsService,
  StatusBreakdown,
  TopProduct,
} from 'src/app/services/api/reports.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` in local time — the format every reports endpoint expects. */
function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    NgApexchartsModule,
    NgxSkeletonLoaderModule,
    AppCardsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private reportsService = inject(ReportsService);
  private coreService = inject(CoreService);
  private translate = inject(TranslateService);
  private dateAdapter = inject(DateAdapter);

  isLoading = signal(true);
  hasError = signal(false);

  summary = signal<ReportSummary | null>(null);
  overTime = signal<OrdersOverTime | null>(null);
  breakdown = signal<StatusBreakdown | null>(null);
  aging = signal<OrdersAging | null>(null);
  attention = signal<AttentionItem[]>([]);
  inventory = signal<InventorySnapshot | null>(null);
  topProducts = signal<TopProduct[]>([]);

  /** Period options in the header dropdown. `custom` is driven by the pickers. */
  readonly periods = [
    { key: 'today', days: 1 },
    { key: 'last_7_days', days: 7 },
    { key: 'last_30_days', days: 30 },
    { key: 'custom', days: 0 },
  ];
  period = signal<string>('last_30_days');

  fromDate = signal<Date>(new Date(Date.now() - 29 * DAY_MS));
  toDate = signal<Date>(new Date());
  from = computed(() => toApiDate(this.fromDate()));
  to = computed(() => toApiDate(this.toDate()));

  /** Status rows beside the donut, in the order the design lists them. */
  readonly statusOrder = ['pending', 'confirmed', 'in_shipping', 'delivered', 'returned', 'cancelled'];
  readonly agingBuckets = ['0_2', '3_5', '6_7', 'over_7'];

  /** Icon and tone per alert, keyed by what the endpoint returns. */
  readonly attentionMeta: Record<string, { icon: string; color: string }> = {
    delayed_orders: { icon: 'solar:bell-bing-line-duotone', color: 'error' },
    pending_confirmation: { icon: 'solar:danger-circle-line-duotone', color: 'warning' },
    returns_pending_receipt: { icon: 'tabler:arrow-back', color: 'warning' },
    low_stock_products: { icon: 'solar:box-line-duotone', color: 'error' },
  };

  ordersTrendChart: any = this.buildTrendChart([], [], [], [], []);
  statusChart: any = this.buildStatusChart([], []);
  agingChart: any = this.buildAgingChart([], []);

  /** Share of total orders, used for the secondary line on the status KPIs. */
  shareOfTotal(value: number | undefined): string {
    const total = this.summary()?.total_orders ?? 0;
    if (!total || value === undefined) return '';
    return `${((value / total) * 100).toFixed(1)}% ${this.translate.instant('dashboard.of_total')}`;
  }

  ngOnInit(): void {
    this.dateAdapter.setLocale(this.coreService.getLanguage() === 'ar' ? 'ar-EG' : 'en-GB');
    this.load();
  }

  onPeriodChange(key: string): void {
    this.period.set(key);
    if (key === 'custom') return; // the pickers drive the range from here
    const preset = this.periods.find((option) => option.key === key);
    if (!preset) return;
    this.toDate.set(new Date());
    this.fromDate.set(new Date(Date.now() - (preset.days - 1) * DAY_MS));
    this.load();
  }

  onDateChange(which: 'from' | 'to', value: Date | null): void {
    if (!value) return;
    this.period.set('custom');
    (which === 'from' ? this.fromDate : this.toDate).set(value);
    this.load();
  }

  private get filters(): ReportFilters {
    return { from: this.from(), to: this.to() };
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const filters = this.filters;

    forkJoin({
      summary: this.reportsService.getSummary(filters),
      overTime: this.reportsService.getOrdersOverTime(filters),
      breakdown: this.reportsService.getStatusBreakdown(filters),
      topProducts: this.reportsService.getTopProducts(filters, 5),
      aging: this.dashboardService.getOrdersAging(filters),
      attention: this.dashboardService.getAttentionRequired(filters),
      inventory: this.dashboardService.getInventorySnapshot(),
    }).subscribe({
      next: ({ summary, overTime, breakdown, topProducts, aging, attention, inventory }) => {
        this.summary.set(summary);
        this.overTime.set(overTime);
        this.breakdown.set(breakdown);
        this.topProducts.set(topProducts.data ?? []);
        this.aging.set(aging);
        this.attention.set(attention.data ?? []);
        this.inventory.set(inventory);

        this.ordersTrendChart = this.buildTrendChart(
          overTime.labels.map((label) => this.shortDate(label)),
          overTime.total,
          overTime.shipped,
          overTime.delivered,
          overTime.failed
        );
        this.statusChart = this.buildStatusChart(
          breakdown.data.map((slice) => this.translate.instant(`dashboard.status.${slice.group}`)),
          breakdown.data.map((slice) => slice.count)
        );
        this.agingChart = this.buildAgingChart(
          aging.data.map((bucket) => this.translate.instant(`dashboard.aging.${bucket.bucket}`)),
          aging.data.map((bucket) => bucket.count)
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  /** Count for one status group, read back off the donut payload. */
  statusCount(group: string): number {
    return this.breakdown()?.data.find((slice) => slice.group === group)?.count ?? 0;
  }

  statusPercentage(group: string): number {
    return this.breakdown()?.data.find((slice) => slice.group === group)?.percentage ?? 0;
  }

  private shortDate(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString(this.coreService.getLanguage(), {
      day: 'numeric',
      month: 'short',
    });
  }

  /** Downloads the dashboard figures as CSV, matching the reports screen export. */
  exportReport(): void {
    const summary = this.summary();
    if (!summary) return;
    const t = (key: string) => this.translate.instant(key);

    const rows: (string | number)[][] = [
      [t('dashboard.export.metric'), t('dashboard.export.value')],
      [t('dashboard.kpi.total_orders'), summary.total_orders],
      [t('dashboard.kpi.delivered'), summary.delivered],
      [t('dashboard.kpi.in_shipping'), summary.shipped],
      [t('dashboard.kpi.pending'), summary.pending],
      [t('dashboard.kpi.returned'), summary.returned],
      [t('dashboard.kpi.cod_collected'), summary.cod_collected],
      [t('dashboard.performance.delivery_rate'), `${summary.delivery_rate}%`],
      [t('dashboard.performance.return_rate'), `${summary.return_rate}%`],
      [t('dashboard.performance.avg_delivery'), summary.avg_delivery_days],
      [t('dashboard.performance.cod_success_rate'), `${summary.cod_success_rate}%`],
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    // The BOM keeps Excel from mangling the Arabic labels.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivoo-dashboard-${this.from()}-to-${this.to()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private buildTrendChart(
    categories: string[],
    total: number[],
    shipped: number[],
    delivered: number[],
    failed: number[]
  ) {
    return {
      series: [
        { name: this.translate.instant('dashboard.series.total'), data: total },
        { name: this.translate.instant('dashboard.series.shipped'), data: shipped },
        { name: this.translate.instant('dashboard.series.delivered'), data: delivered },
        { name: this.translate.instant('dashboard.series.returned'), data: failed },
      ],
      chart: {
        type: 'line',
        fontFamily: 'inherit',
        foreColor: '#adb0bb',
        height: 285,
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
        offsetY: -4,
        itemMargin: { horizontal: 8 },
        markers: { size: 5 },
      },
      grid: { borderColor: 'rgba(0,0,0,0.05)', padding: { left: 4, right: 4, top: -8 } },
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
      chart: { type: 'donut', fontFamily: 'inherit', foreColor: '#adb0bb', height: 150 },
      // Same order as statusOrder: pending, confirmed, shipping, delivered, returned, cancelled.
      colors: ['#ffae1f', '#49beff', '#539bff', '#13deb9', '#fa896b', '#7c8fac'],
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '74%',
            labels: {
              show: true,
              value: { fontSize: '22px', fontWeight: 600, offsetY: 2 },
              total: {
                show: true,
                label: this.translate.instant('dashboard.kpi.total_orders'),
                fontSize: '12px',
              },
            },
          },
        },
      },
      tooltip: { theme: 'dark', fillSeriesColor: false },
    };
  }

  private buildAgingChart(categories: string[], series: number[]) {
    return {
      series: [{ name: this.translate.instant('dashboard.aging.orders'), data: series }],
      chart: { type: 'bar', fontFamily: 'inherit', foreColor: '#adb0bb', height: 195, toolbar: { show: false } },
      plotOptions: {
        bar: { borderRadius: 6, columnWidth: '52%', distributed: true, dataLabels: { position: 'top' } },
      },
      // Older buckets read hotter, so the eye lands on what needs chasing.
      colors: ['#13deb9', '#539bff', '#ffae1f', '#fa896b'],
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: { fontSize: '12px', fontWeight: 600, colors: ['#7c8fac'] },
      },
      legend: { show: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)', padding: { left: 0, right: 0, top: -10 } },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: 0, trim: false, style: { fontSize: '11px' } },
      },
      yaxis: { show: false },
      tooltip: { theme: 'dark' },
    };
  }
}
