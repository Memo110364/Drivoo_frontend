import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import {
  OrderRow,
  ReportFilters,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { downloadCsv } from '../shared/csv-export';

/**
 * Every order in the period, at row level — the report a merchant opens to find
 * one order, or to hand the whole period to a spreadsheet. The comparison tabs
 * aggregate; this one lists.
 */
@Component({
  selector: 'app-orders-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
  ],
  templateUrl: './orders-report.component.html',
  styleUrl: './orders-report.component.scss',
})
export class OrdersReportComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private translate = inject(TranslateService);

  /** Period picked in the page header; changing it reloads from page one. */
  @Input({ required: true }) set filters(value: ReportFilters) {
    this.currentFilters = value;
    if (this.initialised) {
      this.pageIndex.set(0);
      this.load();
    }
  }
  private currentFilters!: ReportFilters;
  private initialised = false;

  isLoading = signal(true);
  hasError = signal(false);
  rows = signal<OrderRow[]>([]);
  total = signal(0);

  /**
   * Never render more than one page. A correctly paged server already returns
   * exactly this many rows, so the slice is a no-op there; it matters for hosts
   * that ignore `limit` — the static demo among them — where the table would
   * otherwise disagree with its own paginator.
   */
  visibleRows = computed(() => this.rows().slice(0, this.pageSize()));

  pageIndex = signal(0);
  pageSize = signal(25);
  readonly pageSizeOptions = [10, 25, 50, 100];

  status = signal('');
  search = signal('');
  private searchTimer?: ReturnType<typeof setTimeout>;

  /** The groups the report filters by; `''` is every status. */
  readonly statuses = [
    'pending',
    'confirmed',
    'in_shipping',
    'delivered',
    'returned',
    'cancelled',
  ];

  readonly columns = [
    'order_code',
    'date',
    'customer',
    'destination',
    'items_count',
    'status',
    'total',
  ];

  /** Badge tone per status group, matching the colours used across the app. */
  readonly statusColor: Record<string, string> = {
    pending: 'warning',
    confirmed: 'info',
    in_shipping: 'secondary',
    delivered: 'success',
    returned: 'error',
    cancelled: 'muted',
  };

  ngOnInit(): void {
    this.initialised = true;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  /** Debounced so typing does not fire a request per keystroke. */
  onSearchChange(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pageIndex.set(0);
      this.load();
    }, 350);
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.reportsService
      .getOrders({
        ...this.currentFilters,
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        status: this.status(),
        search: this.search(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data ?? []);
          this.total.set(res.total ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Exports the whole filtered set, not just the page on screen — a merchant
   * asking for "all orders" means all of them.
   */
  exportCsv(): void {
    this.reportsService
      .getOrders({
        ...this.currentFilters,
        page: 1,
        limit: this.total() || 1000,
        status: this.status(),
        search: this.search(),
      })
      .subscribe({
        next: (res) => this.writeCsv(res.data ?? []),
        // Falling back to the visible page still gives the merchant something.
        error: () => this.writeCsv(this.rows()),
      });
  }

  private writeCsv(rows: OrderRow[]): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('reports.orders.order_code'),
      t('reports.orders.date'),
      t('reports.orders.customer'),
      t('reports.orders.phone'),
      t('reports.dimension.city'),
      t('reports.dimension.area'),
      t('reports.dimension.store'),
      t('reports.dimension.carrier'),
      t('reports.orders.items_count'),
      t('reports.orders.status'),
      t('reports.orders.status_code'),
      t('reports.orders.goods_total'),
      t('reports.orders.shipping_cost'),
      t('reports.orders.total'),
    ];
    const body = rows.map((row) => [
      row.order_code,
      new Date(row.date).toISOString().slice(0, 10),
      row.customer_name,
      row.customer_phone,
      row.city,
      row.area,
      row.store,
      row.carrier,
      row.items_count,
      t(`reports.status.${row.status}`),
      row.status_code,
      row.goods_total,
      row.shipping_cost,
      row.total,
    ]);
    downloadCsv(
      `drivoo-orders-${this.currentFilters.from}-to-${this.currentFilters.to}`,
      header,
      body
    );
  }
}
