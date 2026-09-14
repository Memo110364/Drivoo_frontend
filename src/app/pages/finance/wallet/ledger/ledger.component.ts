import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { MaterialModule } from 'src/app/material.module';
import { LedgerEntry, WalletService } from 'src/app/services/api/wallet.service';
import { downloadCsv } from '../../shared/csv-export';
import { amountClass, formatDateTime } from '../../shared/wallet-format';

/**
 * The wallet ledger — every movement, both directions, with the balance after
 * each one so the account can actually be reconciled.
 *
 * The reference is its own column rather than buried in a sentence, which is
 * what makes it searchable: a merchant looking for one order's payout can find
 * it by the order code.
 */
@Component({
  selector: 'app-wallet-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule, NgxSkeletonLoaderModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ledger.component.html',
  styleUrl: './ledger.component.scss',
})
export class LedgerComponent {
  private walletService = inject(WalletService);
  private translate = inject(TranslateService);

  @Input() currency = '';

  rows = signal<LedgerEntry[]>([]);
  isLoading = signal(true);
  hasError = signal(false);

  /** The movement types the ledger can be narrowed to; `''` is every type. */
  readonly types = [
    'order_payout',
    'withdrawal',
    'shipping_fee',
    'return_shipping',
    'opening_balance',
  ];

  readonly columns = ['date', 'type', 'reference', 'amount', 'balance'];

  type = signal('');
  search = signal('');
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);

  amountClass = amountClass;
  formatDateTime = formatDateTime;

  /**
   * The period's totals, so the ledger answers "what happened this month"
   * without the merchant adding the column up themselves.
   */
  summary = computed(() => {
    const rows = this.visibleRows();
    // An opening balance is a starting point, not money that moved, so it is
    // left out of both totals — including it would double-count the period.
    const moved = rows.filter((row) => row.type !== 'opening_balance');
    const credit = moved.filter((row) => row.amount > 0).reduce((total, row) => total + row.amount, 0);
    const debit = moved.filter((row) => row.amount < 0).reduce((total, row) => total - row.amount, 0);
    return { credit, debit, net: credit - debit, count: moved.length };
  });

  /**
   * The server filters; this repeats the filter on what came back so the demo,
   * whose static host ignores every query parameter, still behaves. Against a
   * real API the rows already match and this is a no-op.
   */
  visibleRows = computed(() => {
    const type = this.type();
    const term = this.search().trim().toLowerCase();
    const from = this.fromDate()?.getTime();
    const to = this.toDate()?.getTime();
    return this.rows().filter((row) => {
      if (type && row.type !== type) return false;
      if (term && !row.reference.toLowerCase().includes(term)) return false;
      const at = new Date(row.date).getTime();
      if (from !== undefined && at < from) return false;
      // The "to" date is a day, not an instant, so the whole day counts.
      if (to !== undefined && at > to + 86399999) return false;
      return true;
    });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.walletService
      .getLedger({
        type: this.type(),
        from: this.asIsoDate(this.fromDate()),
        to: this.asIsoDate(this.toDate()),
        page: 1,
        limit: 500,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.load();
  }

  clearFilters(): void {
    this.type.set('');
    this.search.set('');
    this.fromDate.set(null);
    this.toDate.set(null);
    this.load();
  }

  hasFilters = computed(
    () => !!this.type() || !!this.search() || !!this.fromDate() || !!this.toDate()
  );

  exportCsv(): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('wallet.ledger.date'),
      t('wallet.ledger.type'),
      t('wallet.ledger.reference'),
      t('wallet.ledger.amount'),
      t('wallet.ledger.balance'),
    ];
    const rows = this.visibleRows().map((row) => [
      this.formatDateTime(row.date),
      t(`wallet.ledger_type.${row.type}`),
      row.reference,
      row.amount,
      row.balance,
    ]);
    downloadCsv('drivoo-wallet-ledger', header, rows);
  }

  private asIsoDate(date: Date | null): string {
    if (!date) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
