import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import {
  InventoryMovementReport,
  InventoryMovementRow,
  ReportsService,
} from 'src/app/services/api/reports.service';
import { downloadCsv } from '../shared/csv-export';

/**
 * One product's stock ledger, opened from its name in the products report.
 *
 * Deliberately not period-filtered: a running balance only means anything read
 * from the first movement onwards. Slicing it to a month would show a balance
 * that starts mid-air.
 */
@Component({
  selector: 'app-product-movement',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
  ],
  templateUrl: './product-movement.component.html',
  styleUrl: './product-movement.component.scss',
})
export class ProductMovementComponent {
  private reportsService = inject(ReportsService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  report = signal<InventoryMovementReport | null>(null);
  isLoading = signal(true);
  hasError = signal(false);

  readonly columns = ['date', 'type', 'reference', 'quantity', 'balance'];

  /** The four figures the ledger has to add up to, shown above it. */
  totals = computed(() => {
    const product = this.report()?.product;
    return [
      { key: 'total_stock', value: product?.total_stock, color: 'secondary' },
      { key: 'current_stock', value: product?.current_stock, color: 'primary' },
      { key: 'units_in_transit', value: product?.units_in_transit, color: 'warning' },
      { key: 'units_sold', value: product?.units_sold, color: 'success' },
    ];
  });

  constructor() {
    this.route.paramMap.subscribe((params) => this.load(params.get('id') ?? ''));
  }

  load(productId: string): void {
    if (!productId) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.reportsService.getInventoryMovements(productId).subscribe({
      next: (report) => {
        this.report.set(report);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  /** Pieces arriving are green, pieces leaving red — the sign carries it. */
  quantityClass(row: InventoryMovementRow): string {
    return row.quantity >= 0 ? 'text-success' : 'text-error';
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('reports.movement.date'),
      t('reports.movement.type'),
      t('reports.movement.reference'),
      t('reports.movement.quantity'),
      t('reports.movement.balance'),
    ];
    const rows = report.data.map((row) => [
      row.date,
      t(`reports.movement_type.${row.type}`),
      row.reference,
      row.quantity,
      row.balance,
    ]);
    downloadCsv(`drivoo-stock-movement-${report.product.id}`, header, rows);
  }
}
