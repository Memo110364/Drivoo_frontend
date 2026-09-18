import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderRow, ReportFilters, ReportsService } from 'src/app/services/api/reports.service';
import { downloadCsv } from '../shared/csv-export';

/**
 * The order-by-order detail behind the period totals, delivered as a file
 * rather than a table. The screen answers "how did the period go"; this answers
 * "which orders exactly", which is a spreadsheet job — a merchant filters and
 * sorts thousands of rows far better in Excel than in a paginated web table.
 */
@Component({
  selector: 'app-detailed-export',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule],
  templateUrl: './detailed-export.component.html',
  styleUrl: './detailed-export.component.scss',
})
export class DetailedExportComponent {
  private reportsService = inject(ReportsService);
  private translate = inject(TranslateService);
  private snackBar = inject(MatSnackBar);

  /** The period chosen in the page header; the file covers exactly this range. */
  @Input({ required: true }) filters!: ReportFilters;

  isExporting = signal(false);
  status = signal('');

  /** The groups the export can be narrowed to; `''` is every status. */
  readonly statuses = [
    'pending',
    'confirmed',
    'in_shipping',
    'delivered',
    'returned',
    'cancelled',
  ];

  download(): void {
    this.isExporting.set(true);
    // A high limit pulls the whole filtered period in one request; the endpoint
    // is paged for the screen's benefit, not this one's.
    this.reportsService
      .getOrders({ ...this.filters, page: 1, limit: 100000, status: this.status() })
      .subscribe({
        next: (res) => {
          const rows = res.data ?? [];
          this.isExporting.set(false);
          if (rows.length === 0) {
            this.notify('reports.detailed.empty');
            return;
          }
          this.writeCsv(rows);
        },
        error: () => {
          this.isExporting.set(false);
          this.notify('reports.detailed.failed');
        },
      });
  }

  private notify(key: string): void {
    this.snackBar.open(
      this.translate.instant(key),
      this.translate.instant('reports.detailed.close'),
      { duration: 4000, horizontalPosition: 'center', verticalPosition: 'top' }
    );
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

    const scope = this.status()
      ? this.translate.instant(`reports.status.${this.status()}`)
      : 'all';
    downloadCsv(`drivoo-orders-${scope}-${this.filters.from}-to-${this.filters.to}`, header, body);
  }
}
