import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';

export interface ConfirmDialogData {
  /** i18n keys, so the dialog reads in the user's language. */
  titleKey: string;
  messageKey: string;
  /** Interpolation for the message, e.g. the name of the thing being removed. */
  params?: Record<string, string | number>;
  confirmKey?: string;
  /** Colours the confirm button for a destructive action. */
  destructive?: boolean;
}

/**
 * A confirm step for the wallet's destructive actions.
 *
 * The app's existing delete dialog is hardcoded to English and to the word
 * "product", so it cannot ask about a payment method — and it belongs to the
 * products feature, which this change has no business editing.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MaterialModule, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
