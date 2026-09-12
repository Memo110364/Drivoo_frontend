import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
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
  imports: [CommonModule, MaterialModule, TranslateModule, NgxSkeletonLoaderModule],
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

  private rowsSignal = signal<PerformanceRow[]>([]);
  @Input() set rows(value: PerformanceRow[]) {
    this.rowsSignal.set(value ?? []);
  }
  get rows(): PerformanceRow[] {
    return this.rowsSignal();
  }

  readonly columns = [
    'label',
    'orders',
    'shipped',
    'delivered',
    'returned',
    'delivery_success_rate',
    'return_rate',
    'avg_delivery_days',
  ];

  /** Widest row, so the inline volume bars stay comparable. */
  maxOrders = computed(() => this.rowsSignal().reduce((max, row) => Math.max(max, row.orders), 0));

  /** Green above 90%, amber 75-90, red below — the same thresholds everywhere. */
  rateClass(rate: number): string {
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-warning';
    return 'text-error';
  }

  exportCsv(): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t(this.dimensionKey),
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
