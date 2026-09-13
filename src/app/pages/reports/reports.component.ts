import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import { CoreService } from 'src/app/services/core.service';
import { LogisticsService } from 'src/app/services/api/logistics.service';
import {
  CityPerformance,
  OrdersOverTime,
  ReportFilters,
  ReportSummary,
  ReportsService,
  StatusBreakdown,
  TopProduct,
} from 'src/app/services/api/reports.service';

/** A quick-pick range shown above the date inputs. */
interface RangePreset {
  key: string;
  days: number;
}

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
  ],
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private logisticsService = inject(LogisticsService);
  private coreService = inject(CoreService);
  private translate = inject(TranslateService);
  private dateAdapter = inject(DateAdapter);

  isLoading = signal(true);
  hasError = signal(false);

  summary = signal<ReportSummary | null>(null);
  overTime = signal<OrdersOverTime | null>(null);
  breakdown = signal<StatusBreakdown | null>(null);
  topProducts = signal<TopProduct[]>([]);
  cities = signal<CityPerformance[]>([]);
  cityOptions = signal<{ id: string; name: string }[]>([]);

  readonly presets: RangePreset[] = [
    { key: 'last_7_days', days: 7 },
    { key: 'last_30_days', days: 30 },
    { key: 'last_90_days', days: 90 },
  ];
  activePreset = signal<string>('last_30_days');

  // The pickers work with `Date`; the API only ever sees the `YYYY-MM-DD` form.
  fromDate = signal<Date>(new Date(Date.now() - 29 * DAY_MS));
  toDate = signal<Date>(new Date());
  from = computed(() => toApiDate(this.fromDate()));
  to = computed(() => toApiDate(this.toDate()));
  cityId = signal<string>('');
  statusGroup = signal<string>('');

  readonly statusGroups = ['delivered', 'shipped', 'pending', 'failed'];
  readonly cityColumns = [
    'city_name',
    'orders',
    'delivered',
    'failed',
    'delivery_rate',
    'avg_delivery_days',
    'revenue',
    'net_profit',
  ];

  /** Highest order count across cities — drives the inline bar widths. */
  maxCityOrders = computed(() =>
    this.cities().reduce((max, city) => Math.max(max, city.orders), 0)
  );

  /** Highest revenue across top products — drives the inline bar widths. */
  maxProductRevenue = computed(() =>
    this.topProducts().reduce((max, product) => Math.max(max, product.revenue), 0)
  );

  ordersChart: any = this.buildOrdersChart([], [], [], []);
  statusChart: any = this.buildStatusChart([], []);

  ngOnInit(): void {
    // Otherwise the pickers print US-format dates even on the Arabic UI.
    this.dateAdapter.setLocale(this.coreService.getLanguage() === 'ar' ? 'ar-EG' : 'en-GB');

    this.logisticsService.getCities().subscribe({
      next: (res) => {
        this.cityOptions.set(
          (res?.data ?? []).map((city: any) => ({ id: String(city.id), name: city.name_ar }))
        );
      },
      error: () => this.cityOptions.set([]),
    });
    this.load();
  }

  applyPreset(preset: RangePreset): void {
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

  onFilterChange(): void {
    this.load();
  }

  private get filters(): ReportFilters {
    return {
      from: this.from(),
      to: this.to(),
      city_id: this.cityId(),
      status_group: this.statusGroup(),
    };
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const filters = this.filters;

    forkJoin({
      summary: this.reportsService.getSummary(filters),
      overTime: this.reportsService.getOrdersOverTime(filters),
      breakdown: this.reportsService.getStatusBreakdown(filters),
      topProducts: this.reportsService.getTopProducts(filters),
      cities: this.reportsService.getCitiesPerformance(filters),
    }).subscribe({
      next: ({ summary, overTime, breakdown, topProducts, cities }) => {
        this.summary.set(summary);
        this.overTime.set(overTime);
        this.breakdown.set(breakdown);
        this.topProducts.set(topProducts.data ?? []);
        this.cities.set(cities.data ?? []);

        this.ordersChart = this.buildOrdersChart(
          overTime.labels.map((label) => this.shortDate(label)),
          overTime.total,
          overTime.delivered,
          overTime.failed
        );
        this.statusChart = this.buildStatusChart(
          breakdown.data.map((slice) => this.translate.instant(`reports.groups.${slice.group}`)),
          breakdown.data.map((slice) => slice.count)
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  /** Turns `2026-09-01` into a short localized label for the x axis. */
  private shortDate(day: string): string {
    return new Date(`${day}T00:00:00`).toLocaleDateString(this.coreService.getLanguage(), {
      day: 'numeric',
      month: 'short',
    });
  }

  trendIcon(value: number): string {
    return value > 0 ? 'trending-up' : value < 0 ? 'trending-down' : 'minus';
  }

  trendClass(value: number, higherIsBetter = true): string {
    if (value === 0) return 'text-muted';
    const good = higherIsBetter ? value > 0 : value < 0;
    return good ? 'text-success' : 'text-error';
  }

  /** Downloads the city table as CSV so the numbers can go into a spreadsheet. */
  exportCitiesCsv(): void {
    const header = this.cityColumns.map((column) =>
      this.translate.instant(`reports.table.${column}`)
    );
    const rows = this.cities().map((city) => [
      city.city_name,
      city.orders,
      city.delivered,
      city.failed,
      `${city.delivery_rate}%`,
      city.avg_delivery_days,
      city.revenue,
      city.net_profit,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // The BOM keeps Excel from mangling the Arabic city names.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivoo-cities-${this.from()}-to-${this.to()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private buildOrdersChart(
    categories: string[],
    total: number[],
    delivered: number[],
    failed: number[]
  ) {
    return {
      series: [
        { name: this.translate.instant('reports.series.total'), data: total },
        { name: this.translate.instant('reports.series.delivered'), data: delivered },
        { name: this.translate.instant('reports.series.failed'), data: failed },
      ],
      chart: {
        type: 'area',
        fontFamily: 'inherit',
        foreColor: '#adb0bb',
        height: 320,
        toolbar: { show: false },
        stacked: false,
      },
      colors: ['#635bff', '#13deb9', '#fa896b'],
      stroke: { width: 2, curve: 'smooth' },
      dataLabels: { enabled: false },
      legend: { show: true, position: 'top', horizontalAlign: 'right' },
      grid: { borderColor: 'rgba(0,0,0,0.05)' },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0, stops: [20, 180] },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        // A 90-day range would otherwise print an unreadable wall of labels.
        labels: { rotate: 0, hideOverlappingLabels: true },
        tickAmount: 10,
      },
      yaxis: { min: 0, forceNiceScale: true },
      tooltip: { theme: 'dark' },
    };
  }

  private buildStatusChart(labels: string[], series: number[]) {
    return {
      series,
      labels,
      chart: { type: 'donut', fontFamily: 'inherit', foreColor: '#adb0bb', height: 320 },
      colors: ['#13deb9', '#539bff', '#ffae1f', '#fa896b'],
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom' },
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
                fontSize: '14px',
              },
            },
          },
        },
      },
      tooltip: { theme: 'dark', fillSeriesColor: false },
    };
  }
}
