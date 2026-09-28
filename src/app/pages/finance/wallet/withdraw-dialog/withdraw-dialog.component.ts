import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import {
  PaymentMethod,
  WalletService,
  WithdrawalRules,
} from 'src/app/services/api/wallet.service';
import { METHOD_ICONS } from '../../shared/wallet-format';

export interface WithdrawDialogData {
  available: number;
  rules: WithdrawalRules;
  methods: PaymentMethod[];
}

/**
 * The withdrawal form.
 *
 * Its job is to make the outcome knowable before the merchant commits: how
 * much leaves the wallet, what the transfer costs, and what actually lands.
 * The old screen offered no form at all — only a red banner saying no.
 */
@Component({
  selector: 'app-withdraw-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule],
  templateUrl: './withdraw-dialog.component.html',
  styleUrl: './withdraw-dialog.component.scss',
})
export class WithdrawDialogComponent {
  private walletService = inject(WalletService);
  private dialogRef = inject(MatDialogRef<WithdrawDialogComponent>);
  readonly data = inject<WithdrawDialogData>(MAT_DIALOG_DATA);

  readonly methodIcons = METHOD_ICONS;

  amount = signal<number | null>(null);
  methodId = signal(this.data.methods.find((m) => m.is_default)?.id ?? this.data.methods[0]?.id ?? '');
  isSubmitting = signal(false);
  serverError = signal('');

  selectedMethod = computed(() =>
    this.data.methods.find((method) => method.id === this.methodId())
  );

  /** The transfer fee for the chosen destination — it differs by method. */
  fee = computed(() => {
    const method = this.selectedMethod();
    if (!method) return 0;
    return this.data.rules.fees?.[method.type] ?? 0;
  });

  /** What actually lands. The figure the merchant is really asking about. */
  netAmount = computed(() => Math.max((this.amount() ?? 0) - this.fee(), 0));

  /**
   * Why the form cannot be submitted yet, as an i18n key — so the button says
   * what is missing instead of being mysteriously disabled.
   */
  validationKey = computed(() => {
    const amount = this.amount();
    if (!this.methodId()) return 'wallet.withdraw.errors.no_method';
    if (amount === null || amount <= 0) return 'wallet.withdraw.errors.no_amount';
    if (amount < this.data.rules.minimum_amount) return 'wallet.withdraw.errors.below_minimum';
    if (amount > this.data.available) return 'wallet.withdraw.errors.above_available';
    const max = this.data.rules.maximum_amount;
    if (max != null && amount > max) return 'wallet.withdraw.errors.above_maximum';
    if (amount <= this.fee()) return 'wallet.withdraw.errors.below_fee';
    return '';
  });

  isValid = computed(() => this.validationKey() === '');

  /** The numbers a validation message needs, so none is baked into a string. */
  validationParams = computed(() => ({
    minimum: this.data.rules.minimum_amount,
    maximum: this.data.rules.maximum_amount,
    available: this.data.available,
    fee: this.fee(),
  }));

  useFullBalance(): void {
    this.amount.set(this.data.available);
  }

  submit(): void {
    if (!this.isValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.serverError.set('');
    this.walletService
      .requestWithdrawal({ amount: this.amount()!, payment_method_id: this.methodId() })
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => {
          this.isSubmitting.set(false);
          this.serverError.set('wallet.withdraw.errors.failed');
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
