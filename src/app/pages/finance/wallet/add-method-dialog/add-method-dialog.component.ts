import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorStateMatcher } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { MethodField, WalletService, WithdrawalMethodConfig } from 'src/app/services/api/wallet.service';

export interface AddMethodDialogData {
  existingCount?: number;
}

/**
 * Adding a payout method dynamically based on the backend method definitions.
 *
 * It connects to `finance/method` upon opening to fetch the available withdrawal
 * methods, their icons, minimum request constraints, and dynamic fields to render.
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
  readonly data: AddMethodDialogData | null = inject(MAT_DIALOG_DATA, { optional: true });

  readonly isFirstMethod = computed(() => (this.data?.existingCount ?? 0) === 0);
  isDefault = signal((this.data?.existingCount ?? 0) === 0);

  isLoadingMethods = signal(true);
  loadError = signal('');
  methods = signal<WithdrawalMethodConfig[]>([]);
  selectedMethod = signal<WithdrawalMethodConfig | null>(null);

  formValues = signal<Record<string, any>>({});
  touchedFields = signal<Record<string, boolean>>({});

  private matcherCache = new Map<string, ErrorStateMatcher>();

  isSubmitting = signal(false);
  serverError = signal('');

  constructor() {
    this.loadMethods();
  }

  loadMethods(): void {
    this.isLoadingMethods.set(true);
    this.loadError.set('');
    this.walletService.getFinanceMethods().subscribe({
      next: (result) => {
        this.methods.set(result.data ?? []);
        this.isLoadingMethods.set(false);
      },
      error: () => {
        this.loadError.set('wallet.add_method.methods_error');
        this.isLoadingMethods.set(false);
      },
    });
  }

  selectMethod(method: WithdrawalMethodConfig): void {
    this.selectedMethod.set(method);
    const initial: Record<string, any> = {};
    for (const field of method.fields ?? []) {
      initial[field.key] = '';
    }
    this.formValues.set(initial);
    this.touchedFields.set({});
    this.matcherCache.clear();
    this.serverError.set('');
    this.isDefault.set(this.isFirstMethod());
  }

  back(): void {
    this.selectedMethod.set(null);
    this.formValues.set({});
    this.touchedFields.set({});
    this.matcherCache.clear();
    this.serverError.set('');
  }

  onFieldChange(key: string, value: any): void {
    this.formValues.update((vals) => ({ ...vals, [key]: value }));
  }

  markTouched(key: string): void {
    this.touchedFields.update((t) => ({ ...t, [key]: true }));
  }

  isTouched(key: string): boolean {
    return !!this.touchedFields()[key];
  }

  getMatcher(key: string, field: MethodField): ErrorStateMatcher {
    let matcher = this.matcherCache.get(key);
    if (!matcher) {
      matcher = {
        isErrorState: (control: AbstractControl | null) => {
          const hasError = !!this.getFieldError(field);
          const isTouched = this.isTouched(key);
          return hasError && isTouched;
        },
      };
      this.matcherCache.set(key, matcher);
    }
    return matcher;
  }

  /** Safely parse regex string whether formatted as /pattern/flags or plain pattern, ensuring full-string match */
  private parseRegex(patternStr: string): RegExp | null {
    if (!patternStr || !patternStr.trim()) return null;
    try {
      let pattern = patternStr.trim();
      let flags = '';
      const match = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
      if (match) {
        pattern = match[1];
        flags = match[2].replace(/g/g, '');
      }
      if (pattern.startsWith('^')) {
        pattern = pattern.slice(1);
      }
      if (pattern.endsWith('$')) {
        pattern = pattern.slice(0, -1);
      }
      return new RegExp(`^(?:${pattern})$`, flags);
    } catch {
      return null;
    }
  }

  getFieldError(field: MethodField): string {
    const rawValue = this.formValues()[field.key];
    const value = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : '';

    const isRequired =
      field.required ||
      (typeof field.rule === 'string'
        ? field.rule.includes('required')
        : Array.isArray(field.rule)
        ? field.rule.includes('required')
        : false);

    if (isRequired && !value) {
      return 'wallet.add_method.errors.field_required';
    }

    if (value && field.regex) {
      const reg = this.parseRegex(field.regex);
      if (reg && !reg.test(value)) {
        return 'wallet.add_method.errors.field_invalid';
      }
    }

    const hasPhoneRule =
      typeof field.rule === 'string'
        ? /phone/i.test(field.rule)
        : Array.isArray(field.rule)
        ? field.rule.some((r) => /phone/i.test(r))
        : false;

    if (value && hasPhoneRule) {
      if (!/^(?:\+2|002)?01[0125][0-9]{8}$/.test(value)) {
        return 'wallet.add_method.errors.phone';
      }
    }

    if (value && field.type === 'number' && !field.regex && !hasPhoneRule) {
      if (!/^\d+$/.test(value)) {
        return 'wallet.add_method.errors.field_invalid';
      }
    }

    return '';
  }

  validationKey = computed(() => {
    const method = this.selectedMethod();
    if (!method) return 'wallet.add_method.errors.no_type';

    for (const field of method.fields ?? []) {
      const err = this.getFieldError(field);
      if (err) return err;
    }
    return '';
  });

  isValid = computed(() => this.validationKey() === '');

  submit(): void {
    if (!this.isValid() || this.isSubmitting()) return;
    const method = this.selectedMethod();
    if (!method) return;

    this.isSubmitting.set(true);
    this.serverError.set('');

    const payload: any = {
      method: method.id,
      type: method.name,
      fields:[],
      is_default: this.isDefault(),
    };

    for (const field of method.fields ?? []) {
      const val = this.formValues()[field.key];
      if (val !== undefined && val !== null) {
        payload.fields.push({
          name: field.key,
          value: typeof val === 'string' ? val.trim() : val,
        });
      }
    }

    this.walletService.addPaymentMethod(payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set('wallet.add_method.errors.failed');
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
