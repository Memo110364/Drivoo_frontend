import {CommonModule} from '@angular/common';
import {Component, computed, inject, Input, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {provideNativeDateAdapter} from '@angular/material/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {NgxSkeletonLoaderModule} from 'ngx-skeleton-loader';
import {UninvoicedEntry, WalletService} from '../../../../services/api/wallet.service';
import {MatCardContent, MatCard} from '@angular/material/card';
import {amountClass, formatDateTime} from '../../shared/wallet-format';
import {downloadCsv} from '../../shared/csv-export';
import {from} from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wallet-uninvoiced',
  standalone: true,
  imports: [
    CommonModule, TranslateModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatTableModule, ReactiveFormsModule, FormsModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, NgxSkeletonLoaderModule, MatButtonModule,
    MatCardContent,
    MatCard
  ],
  templateUrl: './uninvoiced.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './uninvoiced.component.scss',
})
export class UninvoicedComponent {
  private translate = inject(TranslateService);
  private walletService = inject(WalletService);
  private readonly router = inject(Router);
  @Input() currency = '';

  rows = signal<UninvoicedEntry[]>([]);
  isLoading = signal(true);
  isExporting = signal(false);
  hasError = signal(false);
  total = signal(0);
  amountClass = amountClass;
  formatDateTime = formatDateTime;

  readonly types = [
      "confirmation",
      "packing",
      "picking",
      "receiving_goods",
      "shipping_overweight",
      "shipping_change_address",
      "shipping_resend",
      "shipping_return",
      "shipping_delivery",
      "shipping_cancel",
      "taxes",
      "quality inspection",
  ];

  readonly pageSize = 25;
  pageIndex = signal(0);

  readonly columns = ['date', 'type', 'reference', 'amount'];

  type = signal('');
  search = signal('');
  fromDate = signal<Date | null>(null);
  toDate = signal<Date | null>(null);


  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.walletService
      .getUninvoiced({
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
  summary = computed(() => {
    const rows = this.filteredRows();
    // An opening balance is a starting point, not money that moved, so it is
    // left out of both totals — including it would double-count the period.
    console.log("summary",rows.filter((row) => parseFloat(row.cost) > 0).reduce((total, row) => total + parseFloat(row.cost), 0))
    const moved = rows.filter((row) => row.type !== 'opening_balance');
    const credit = moved.filter((row) => parseFloat(row.cost) > 0).reduce((total, row) => total + parseFloat(row.cost), 0);
    const debit = moved.filter((row) => parseFloat(row.cost) < 0).reduce((total, row) => total - parseFloat(row.cost), 0);
    return {credit, debit, net: credit - debit, count: moved.length};
  });
  feeBreakdown = computed(() => {
    const totals = new Map<string, number>();
    for (const row of this.filteredRows()) {
      if (parseFloat(row.cost) < 0 || row.type === 'withdrawal') continue;
      totals.set(row.type, (totals.get(row.type) ?? 0) + parseFloat(row.cost));
    }
    return [...totals.entries()]
      .map(([type, cost]) => ({type, cost}))
      .sort((a, b) => b.cost - a.cost);
  });
  feeTotal = computed(() =>
    this.feeBreakdown().reduce((total, fee) => total + fee.cost, 0)
  );
  visibleRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });
constructor() {
    this.load();
  }
  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    // No need to call load() — the computed() above updates immediately.
  }
  onFilterChange(): void {
    // A new filter means a new first page; staying on page 4 of a shorter
    // result would show nothing.
    this.pageIndex.set(0);
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
  filteredRows = computed(() => {
    const type = this.type();
    const term = this.search().trim().toLowerCase();
    const from = this.fromDate()?.getTime();
    const to = this.toDate()?.getTime();
    return this.rows().filter((row) => {
      if (type && row.type !== type) return false;
      if (term && !row.reference.toLowerCase().includes(term)) return false;
      const at = new Date(row.created_at).getTime();
      if (from !== undefined && at < from) return false;
      // The "to" date is a day, not an instant, so the whole day counts.
      if (to !== undefined && at > to + 86399999) return false;
      return true;
    });
  });

  private asIsoDate(date: Date | null): string {
    if (!date) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  exportCsv(): void {
    this.isExporting.set(true);
    this.walletService
      .getUninvoiced({
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

  private writeCsv(rows: UninvoicedEntry[]): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('wallet.ledger.date'),
      t('wallet.ledger.type'),
      t('wallet.ledger.reference'),
      t('wallet.ledger.amount'),
    ];
    const body = rows.map((row) => [
      this.formatDateTime(row.created_at),
      t(`wallet.uninvoiced_type.${row.type}`),
      row.reference,
      row.cost
    ]);
    downloadCsv('drivoo-wallet-ledger', header, body);
  }
  reference(ref:string, type:string){
    const typeArray = type.split('\\');
    const lastType=typeArray[typeArray.length-1].toLowerCase();
    if(lastType=='order'){
      return `#order-${ref}`;
    }else if (lastType=='productstockrequest'){
      return `#product-stock-request-${ref}`;
    }
   return ref;
  }
  navigateToReference(ref:string, type:string){
    const typeArray = type.split('\\');
    const lastType=typeArray[typeArray.length-1].toLowerCase();
    if(lastType=='order'){
      //navigate at block target="_blank"
      const url = this.router.serializeUrl(this.router.createUrlTree(['/orders/view/', ref]));
      window.open(url, '_blank');
    }else if (lastType=='productstockrequest'){
      const url = this.router.serializeUrl(this.router.createUrlTree(['/product-stock-requests/view/', ref]));
      window.open(url, '_blank');
    }
  }




}
