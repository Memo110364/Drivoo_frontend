import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { MaterialModule } from 'src/app/material.module';
import { PaymentMethod, WalletService } from 'src/app/services/api/wallet.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AddMethodDialogComponent } from '../add-method-dialog/add-method-dialog.component';
import { METHOD_ICONS, formatDate, methodStatusClass } from '../../shared/wallet-format';

/**
 * Where the merchant can be paid: a bank account, Vodafone Cash, InstaPay, or
 * cash collected from a Drivoo branch.
 *
 * Cards rather than a table — a merchant has two or three of these, not two
 * hundred, and each type carries different details. The table this replaces had
 * two columns both headed "Activein", one of which was the action buttons.
 */
@Component({
  selector: 'app-wallet-payment-methods',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, NgxSkeletonLoaderModule],
  templateUrl: './payment-methods.component.html',
  styleUrl: './payment-methods.component.scss',
})
export class PaymentMethodsComponent {
  private walletService = inject(WalletService);
  private translate = inject(TranslateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @Input() rows: PaymentMethod[] = [];
  @Input() loading = false;
  /** Raised after any change, so the wallet reloads the whole picture. */
  @Output() changed = new EventEmitter<void>();

  readonly methodIcons = METHOD_ICONS;
  statusClass = methodStatusClass;
  formatDate = formatDate;

  busyId = '';

  /** The extra fields a type carries, as label/value pairs the card lists. */
  detailPairs(method: PaymentMethod): { key: string; value: string }[] {
    return Object.entries(method.details ?? {})
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({ key, value }));
  }

  openAddDialog(): void {
    this.dialog
      .open(AddMethodDialogComponent, { width: '520px', maxWidth: '94vw', autoFocus: false })
      .afterClosed()
      .subscribe((added) => {
        if (added) {
          this.notify('wallet.methods.added');
          this.changed.emit();
        }
      });
  }

  setDefault(method: PaymentMethod): void {
    if (method.is_default || method.status !== 'active') return;
    this.busyId = method.id;
    this.walletService.setDefaultPaymentMethod(method.id).subscribe({
      next: () => {
        this.busyId = '';
        this.notify('wallet.methods.default_set');
        this.changed.emit();
      },
      error: () => {
        this.busyId = '';
        this.notify('wallet.methods.failed');
      },
    });
  }

  remove(method: PaymentMethod): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        maxWidth: '94vw',
        data: {
          titleKey: 'wallet.methods.remove_title',
          messageKey: 'wallet.methods.remove_message',
          params: { label: method.label },
          confirmKey: 'wallet.methods.remove_confirm',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.busyId = method.id;
        this.walletService.deletePaymentMethod(method.id).subscribe({
          next: () => {
            this.busyId = '';
            this.notify('wallet.methods.removed');
            this.changed.emit();
          },
          error: () => {
            this.busyId = '';
            this.notify('wallet.methods.failed');
          },
        });
      });
  }

  private notify(key: string): void {
    this.snackBar.open(
      this.translate.instant(key),
      this.translate.instant('wallet.close'),
      { duration: 4000, horizontalPosition: 'center', verticalPosition: 'top' }
    );
  }
}
