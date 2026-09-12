import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { PerformanceRow } from 'src/app/services/api/reports.service';
import { downloadCsv } from './csv-export';

/**
 * The comparison table every dimension shares — carrier, city, area, product,
 * store. Each row carries counts *and* rates, because a count on its own ranks
 * a busy dimension above a healthy one.
 */
@Component({
  selector: 'app-performance-table',
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule, TranslateModule, NgxSkeletonLoaderModule],
  templateUrl: './performance-table.component.html',
  styleUrl: './performance-table.component.scss',
})
export class PerformanceTableComponent {
  private translate = inject(TranslateService);

  /** i18n key for the card heading, e.g. `reports.tabs.shipping.title`. */
  @Input({ required: true }) titleKey = '';
  @Input() subtitleKey = '';
  /** i18n key naming the first column — "Carrier", "City", "Product"… */
  @Input({ required: true }) dimensionKey = '';
  /** Used for the exported file name. */
  @Input({ required: true }) exportName = '';
  @Input() loading = false;
  /** Adds the revenue column. Off elsewhere, because it crowds the rates. */
  @Input() showRevenue = false;
  /**
   * Adds the two stock columns, next to the dimension they belong to. Only the
   * product dimension has stock — a city does not hold any.
   */
  @Input() showStock = false;
  /**
   * When set, each label links to `[rowLinkBase, row.key]` — the drill-down
   * behind the row. Empty leaves the label as plain text.
   */
  @Input() rowLinkBase = '';

  private rowsSignal = signal<PerformanceRow[]>([]);
  @Input() set rows(value: PerformanceRow[]) {
    this.rowsSignal.set(value ?? []);
  }
  get rows(): PerformanceRow[] {
    return this.rowsSignal();
  }

  private readonly baseColumns = [
    'orders',
    'shipped',
    'delivered',
    'returned',
    'delivery_success_rate',
    'return_rate',
    'avg_delivery_days',
  ];

  get columns(): string[] {
    // Stock sits right after the product, because it is what the merchant reads
    // the row against: 300 orders means something different on 20 pieces than
    // on 2,000.
    return [
      'label',
      ...(this.showStock ? ['total_stock', 'current_stock'] : []),
      ...this.baseColumns,
      ...(this.showRevenue ? ['revenue'] : []),
    ];
  }

  /** Widest row, so the inline volume bars stay comparable. */
  maxOrders = computed(() => this.rowsSignal().reduce((max, row) => Math.max(max, row.orders), 0));

  /** Green above 90%, amber 75-90, red below — the same thresholds everywhere. */
  rateClass(rate: number): string {
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-warning';
    return 'text-error';
  }

  /**
   * Colours current stock against the product's own warning threshold, which
   * the backend sets per product — there is no global "low" number to invent.
   */
  stockClass(row: PerformanceRow): string {
    const stock = row.current_stock ?? 0;
    if (stock === 0) return 'text-error';
    if (row.warning_stock_number != null && stock <= row.warning_stock_number) {
      return 'text-warning';
    }
    return 'text-success';
  }

  exportCsv(): void {
    const t = (key: string) => this.translate.instant(key);
    const stockHeader = this.showStock
      ? [t('reports.table.total_stock'), t('reports.table.current_stock')]
      : [];
    const header = [
      t(this.dimensionKey),
      ...stockHeader,
      t('reports.table.orders'),
      t('reports.table.shipped'),
      t('reports.table.delivered'),
      t('reports.table.returned'),
      t('reports.table.delivery_success_rate'),
      t('reports.table.return_rate'),
      t('reports.table.avg_delivery_days'),
      t('reports.table.revenue'),
    ];
    const rows = this.rowsSignal().map((row) => [
      row.label,
      ...(this.showStock ? [row.total_stock ?? '', row.current_stock ?? ''] : []),
      row.orders,
      row.shipped,
      row.delivered,
      row.returned,
      `${row.delivery_success_rate}%`,
      `${row.return_rate}%`,
      row.avg_delivery_days,
      row.revenue,
    ]);
    downloadCsv(this.exportName, header, rows);
  }
}
