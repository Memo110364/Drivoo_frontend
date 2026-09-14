import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import {
  PaymentMethod,
  WalletBalance,
  WalletService,
  WithdrawalOptions,
  WithdrawalRequest,
} from 'src/app/services/api/wallet.service';
import { LedgerComponent } from './ledger/ledger.component';
import { PaymentMethodsComponent } from './payment-methods/payment-methods.component';
import { WithdrawalsComponent } from './withdrawals/withdrawals.component';
import { WithdrawDialogComponent } from './withdraw-dialog/withdraw-dialog.component';
import { formatDate } from '../shared/wallet-format';

/**
 * The merchant's wallet: what they hold, what moved, and how to get it out.
 *
 * The three balances sit above every tab because each tab is a different
 * question about the same money. The one number that matters most — when the
 * pending side becomes available — is spelled out rather than left implied.
 */
@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TranslateModule,
    NgxSkeletonLoaderModule,
    LedgerComponent,
    WithdrawalsComponent,
    PaymentMethodsComponent,
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent {
  private walletService = inject(WalletService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  balance = signal<WalletBalance | null>(null);
  options = signal<WithdrawalOptions | null>(null);
  methods = signal<PaymentMethod[]>([]);
  withdrawals = signal<WithdrawalRequest[]>([]);

  isLoading = signal(true);
  hasError = signal(false);
  selectedTab = signal(0);

  /**
   * The three headline figures. Pending is amber, never red: money settling is
   * not money at risk, and red would tell the merchant otherwise.
   */
  tiles = computed(() => {
    const balance = this.balance();
    return [
      { key: 'total', value: balance?.total, color: 'primary', icon: 'solar:wallet-linear' },
      { key: 'pending', value: balance?.pending, color: 'warning', icon: 'solar:clock-circle-linear' },
      { key: 'available', value: balance?.available, color: 'success', icon: 'solar:check-circle-linear' },
    ];
  });

  /** Only the active methods can receive a transfer. */
  payableMethods = computed(() => this.methods().filter((method) => method.status === 'active'));

  constructor() {
    const tab = Number(this.route.snapshot.data['tab'] ?? 0);
    this.selectedTab.set(Number.isFinite(tab) ? tab : 0);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    forkJoin({
      balance: this.walletService.getBalance(),
      options: this.walletService.getWithdrawalOptions(),
      methods: this.walletService.getPaymentMethods(),
      withdrawals: this.walletService.getWithdrawals(),
    }).subscribe({
      next: (result) => {
        this.balance.set(result.balance);
        this.options.set(result.options);
        this.methods.set(result.methods.data ?? []);
        this.withdrawals.set(result.withdrawals.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  formatDate = formatDate;

  /**
   * Opens the withdrawal form. The button that calls this is disabled when the
   * server says a request cannot be opened, and the reason is shown beside it —
   * a blocked action that does not say why is the flaw this screen replaces.
   */
  openWithdrawDialog(): void {
    const options = this.options();
    const balance = this.balance();
    if (!options || !balance) return;

    this.dialog
      .open(WithdrawDialogComponent, {
        width: '520px',
        maxWidth: '94vw',
        autoFocus: false,
        data: {
          available: balance.available,
          rules: options.rules,
          methods: this.payableMethods(),
        },
      })
      .afterClosed()
      .subscribe((submitted) => {
        if (submitted) {
          this.notify('wallet.withdraw.submitted');
          this.load();
        }
      });
  }

  onMethodsChanged(): void {
    this.load();
  }

  private notify(key: string): void {
    this.snackBar.open(
      this.translate.instant(key),
      this.translate.instant('wallet.close'),
      { duration: 4000, horizontalPosition: 'center', verticalPosition: 'top' }
    );
  }
}
