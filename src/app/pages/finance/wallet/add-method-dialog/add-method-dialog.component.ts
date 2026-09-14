import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { CashBranch, WalletService } from 'src/app/services/api/wallet.service';
import { METHOD_ICONS } from '../../shared/wallet-format';

/**
 * Adding a place to be paid.
 *
 * The type is chosen first, and only that type's fields are then asked for —
 * a bank account and a Vodafone Cash wallet have nothing in common but the
 * owner's name, so one shared form would ask for fields that do not apply.
 */
@Component({
  selector: 'app-add-method-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TranslateModule],
  templateUrl: './add-method-dialog.component.html',
  styleUrl: './add-method-dialog.component.scss',
})
export class AddMethodDialogComponent {
  private walletService = inject(WalletService);
  private dialogRef = inject(MatDialogRef<AddMethodDialogComponent>);

  readonly methodIcons = METHOD_ICONS;
  readonly types = ['bank_account', 'vodafone_cash', 'instapay', 'cash'];

  type = signal('');
  isSubmitting = signal(false);
  serverError = signal('');

  branches = signal<CashBranch[]>([]);

  // One field per thing the four types can ask for. Each type reads only the
  // ones it needs, which keeps the payload explicit rather than a loose bag.
  holderName = signal('');
  bankName = signal('');
  accountNumber = signal('');
  branchName = signal('');
  phone = signal('');
  instapayAddress = signal('');
  cashBranchId = signal('');

  constructor() {
    this.walletService.getCashBranches().subscribe({
      next: (result) => this.branches.set(result.data ?? []),
      // A missing branch list only disables the cash option; it is not an
      // error worth blocking the whole dialog for.
      error: () => this.branches.set([]),
    });
  }

  /**
   * Egyptian mobile numbers: 11 digits opening 010, 011, 012 or 015. Checked
   * here so the merchant is told before submitting, not after the transfer
   * fails — the server validates too, and its answer wins.
   */
  private readonly phonePattern = /^01[0125][0-9]{8}$/;

  /** Why the form cannot be submitted yet, as an i18n key. */
  validationKey = computed(() => {
    switch (this.type()) {
      case 'bank_account':
        if (!this.holderName().trim()) return 'wallet.add_method.errors.holder_name';
        if (!this.bankName().trim()) return 'wallet.add_method.errors.bank_name';
        // IBAN and local account numbers differ in length, so only the shape
        // is checked here; the bank is the authority on the rest.
        if (this.accountNumber().trim().length < 8) return 'wallet.add_method.errors.account_number';
        return '';
      case 'vodafone_cash':
        if (!this.holderName().trim()) return 'wallet.add_method.errors.holder_name';
        if (!this.phonePattern.test(this.phone().trim())) return 'wallet.add_method.errors.phone';
        return '';
      case 'instapay':
        if (!this.holderName().trim()) return 'wallet.add_method.errors.holder_name';
        if (!this.isValidInstapay()) return 'wallet.add_method.errors.instapay';
        return '';
      case 'cash':
        if (!this.holderName().trim()) return 'wallet.add_method.errors.holder_name';
        if (!this.cashBranchId()) return 'wallet.add_method.errors.branch';
        return '';
      default:
        return 'wallet.add_method.errors.no_type';
    }
  });

  isValid = computed(() => this.validationKey() === '');

  /** An InstaPay address is either an IPA handle or a mobile number. */
  private isValidInstapay(): boolean {
    const value = this.instapayAddress().trim();
    if (!value) return false;
    if (this.phonePattern.test(value)) return true;
    return /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(value);
  }

  selectType(type: string): void {
    this.type.set(type);
    this.serverError.set('');
  }

  back(): void {
    this.type.set('');
  }

  submit(): void {
    if (!this.isValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.serverError.set('');
    this.walletService.addPaymentMethod(this.payload()).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set('wallet.add_method.errors.failed');
      },
    });
  }

  /** Only the fields the chosen type actually uses. */
  private payload(): Record<string, unknown> {
    const base = { type: this.type(), holder_name: this.holderName().trim() };
    switch (this.type()) {
      case 'bank_account':
        return {
          ...base,
          bank_name: this.bankName().trim(),
          account_number: this.accountNumber().trim(),
          branch: this.branchName().trim(),
        };
      case 'vodafone_cash':
        return { ...base, phone: this.phone().trim() };
      case 'instapay':
        return { ...base, instapay_address: this.instapayAddress().trim() };
      case 'cash':
        return { ...base, branch_id: this.cashBranchId() };
      default:
        return base;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
