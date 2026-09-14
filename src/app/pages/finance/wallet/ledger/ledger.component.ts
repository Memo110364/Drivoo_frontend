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
  isExporting = signal(false);
  hasError = signal(false);
  /** What the server says the filtered set holds, for the paginator. */
  total = signal(0);

  /**
   * The movement types the ledger can be narrowed to; `''` is every type.
   *
   * `other_service` is the one that goes both ways — a charge for something
   * extra, or a credit back. Nothing here special-cases it, because the
   * direction lives on the amount's sign rather than on the type.
   */
  readonly types = [
    'order_payout',
    'withdrawal',
    'shipping_fee',
    'return_shipping',
    'confirmation_fee',
    'packaging_fee',
    'storage_fee',
    'other_service',
    'opening_balance',
  ];

  /** A page of movements; the ledger is the one list that grows without limit. */
  readonly pageSize = 25;
  pageIndex = signal(0);

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
    const rows = this.filteredRows();
    // An opening balance is a starting point, not money that moved, so it is
    // left out of both totals — including it would double-count the period.
    const moved = rows.filter((row) => row.type !== 'opening_balance');
    const credit = moved.filter((row) => row.amount > 0).reduce((total, row) => total + row.amount, 0);
    const debit = moved.filter((row) => row.amount < 0).reduce((total, row) => total - row.amount, 0);
    return { credit, debit, net: credit - debit, count: moved.length };
  });

  /**
   * What the merchant paid Drivoo in the filtered period, and on what.
   *
   * The ledger now carries six kinds of charge, so "out: 138,730" on its own
   * stopped being an answer. Withdrawals are left out — that is the merchant's
   * own money moving, not a cost.
   */
  feeBreakdown = computed(() => {
    const totals = new Map<string, number>();
    for (const row of this.filteredRows()) {
      if (row.amount >= 0 || row.type === 'withdrawal') continue;
      totals.set(row.type, (totals.get(row.type) ?? 0) - row.amount);
    }
    return [...totals.entries()]
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);
  });

  feeTotal = computed(() =>
    this.feeBreakdown().reduce((total, fee) => total + fee.amount, 0)
  );

  /**
   * The server filters; this repeats the filter on what came back so the demo,
   * whose static host ignores every query parameter, still behaves. Against a
   * real API the rows already match and this is a no-op.
   */
  filteredRows = computed(() => {
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

  /**
   * One page of the filtered rows. The request already asks the server for a
   * page; this slice is what makes the demo behave, since a static host returns
   * everything it has. Against a real paging API it is a no-op.
   */
  visibleRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
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
        page: this.pageIndex() + 1,
        limit: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.rows.set(page.data ?? []);
          this.total.set(page.total ?? page.data?.length ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    // A new filter means a new first page; staying on page 4 of a shorter
    // result would show nothing.
    this.pageIndex.set(0);
    this.load();
  }

  onPageChange(event: { pageIndex: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  clearFilters(): void {
    this.type.set('');
    this.search.set('');
    this.fromDate.set(null);
    this.toDate.set(null);
    this.pageIndex.set(0);
    this.load();
  }

  hasFilters = computed(
    () => !!this.type() || !!this.search() || !!this.fromDate() || !!this.toDate()
  );

  /**
   * Downloads the whole filtered period, not the twenty-five rows on screen —
   * a merchant asking for their statement means all of it. The screen is paged
   * for speed; the file is not.
   */
  exportCsv(): void {
    this.isExporting.set(true);
    this.walletService
      .getLedger({
        type: this.type(),
        from: this.asIsoDate(this.fromDate()),
        to: this.asIsoDate(this.toDate()),
        page: 1,
        limit: 100000,
      })
      .subscribe({
        next: (page) => {
          this.isExporting.set(false);
          this.writeCsv(page.data ?? []);
        },
        // Falling back to what is already loaded still produces a file, which
        // beats a button that silently does nothing.
        error: () => {
          this.isExporting.set(false);
          this.writeCsv(this.filteredRows());
        },
      });
  }

  private writeCsv(rows: LedgerEntry[]): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('wallet.ledger.date'),
      t('wallet.ledger.type'),
      t('wallet.ledger.reference'),
      t('wallet.ledger.amount'),
      t('wallet.ledger.balance'),
    ];
    const body = rows.map((row) => [
      this.formatDateTime(row.date),
      t(`wallet.ledger_type.${row.type}`),
      row.reference,
      row.amount,
      row.balance,
    ]);
    downloadCsv('drivoo-wallet-ledger', header, body);
  }

  private asIsoDate(date: Date | null): string {
    if (!date) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
