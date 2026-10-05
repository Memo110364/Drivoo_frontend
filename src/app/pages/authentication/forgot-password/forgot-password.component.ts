import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { CoreService, SUPPORTED_LANGUAGES } from 'src/app/services/core.service';
import { environment } from 'src/environments/environment';

/** Same union the sign-in field accepts: a merchant has one of each. */
const PHONE = /^01[0125][0-9]{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneOrEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return PHONE.test(value) || EMAIL.test(value) ? null : { phoneOrEmail: true };
}

/**
 * Asks for a reset link.
 *
 * The endpoint does not exist yet — it is written down in
 * docs/backend-requirements.md. Until it does, this screen is the contract:
 * it posts what the backend will need and handles every answer it can give.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private http = inject(HttpClient);
  private settings = inject(CoreService);
  private translate = inject(TranslateService);

  readonly languages = Object.keys(SUPPORTED_LANGUAGES);

  isSubmitting = signal(false);
  isSent = signal(false);
  errorKey = signal('');

  form = new FormGroup({
    identifier: new FormControl('', [Validators.required, phoneOrEmail]),
  });

  get f() {
    return this.form.controls;
  }

  get language(): string {
    return this.settings.getLanguage();
  }

  /**
   * `CoreService` owns `<html lang>` and `<html dir>`; the strings are
   * ngx-translate's. The header calls both and this page has no header, so it
   * calls both itself — otherwise the page flips direction without changing
   * language.
   */
  setLanguage(language: string): void {
    this.settings.setLanguage(language);
    this.translate.use(language);
  }

  /** What the merchant typed, so the sent screen can name where it went. */
  sentTo = signal('');

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const identifier = String(this.form.value.identifier ?? '').trim();
    this.errorKey.set('');
    this.isSubmitting.set(true);

    // Same reason as the sign-in page: the published demo is static files and
    // cannot answer a POST, so the request below would always fail there.
    if (environment.demoAccess) {
      this.isSubmitting.set(false);
      this.sentTo.set(identifier);
      this.isSent.set(true);
      return;
    }

    this.http
      .post(`${environment.apiUrl}auth/forgot-password`, { identifier })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.sentTo.set(identifier);
          this.isSent.set(true);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          // Whether the account exists is deliberately not revealed: answering
          // "no such account" turns this form into a way of discovering which
          // phone numbers are registered. A 404 is treated as a success.
          if (error?.status === 404) {
            this.sentTo.set(identifier);
            this.isSent.set(true);
            return;
          }
          this.errorKey.set(
            error?.status === 429 ? 'auth.errors.too_many' : 'auth.errors.reset_failed'
          );
        },
      });
  }

  retry(): void {
    this.isSent.set(false);
    this.errorKey.set('');
  }
}
