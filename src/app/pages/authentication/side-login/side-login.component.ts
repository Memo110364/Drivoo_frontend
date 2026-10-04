import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { CoreService, SUPPORTED_LANGUAGES } from 'src/app/services/core.service';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingService } from '../../../services/loading.service';
import { environment } from 'src/environments/environment';

/**
 * Egyptian mobile numbers are 11 digits opening 010, 011, 012 or 015. A
 * merchant signs in with that or with their email, and the single field takes
 * either — which is why the check is a union rather than one pattern.
 *
 * It is a shape check only. The server decides whether the account exists.
 */
const PHONE = /^01[0125][0-9]{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneOrEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return PHONE.test(value) || EMAIL.test(value) ? null : { phoneOrEmail: true };
}

/** Where a remembered identifier is kept. The password is never stored. */
const REMEMBERED_IDENTIFIER = 'drivoo.login.identifier';

@Component({
  selector: 'app-side-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './side-login.component.html',
  styleUrl: './side-login.component.scss',
  providers: [AuthService],
})
export class AppSideLoginComponent {
  private settings = inject(CoreService);
  private translate = inject(TranslateService);
  private routes = inject(Router);
  private service = inject(AuthService);
  private loadingService = inject(LoadingService);

  readonly languages = Object.keys(SUPPORTED_LANGUAGES);

  /** i18n key of whatever went wrong, or empty. */
  errorKey = signal('');
  isSubmitting = signal(false);
  showPassword = signal(false);
  capsLockOn = signal(false);

  form = new FormGroup({
    uname: new FormControl('', [Validators.required, phoneOrEmail]),
    password: new FormControl('', [Validators.required]),
    /** Remembers the identifier for next time — never the password. */
    remember: new FormControl(false),
  });

  constructor() {
    const remembered = localStorage.getItem(REMEMBERED_IDENTIFIER);
    if (remembered) {
      this.form.patchValue({ uname: remembered, remember: true });
    }
  }

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

  /** Warns before the password is rejected for a reason the eye cannot see. */
  onPasswordKey(event: KeyboardEvent): void {
    this.capsLockOn.set(event.getModifierState?.('CapsLock') ?? false);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { uname, password, remember } = this.form.getRawValue();
    const identifier = String(uname ?? '').trim();

    this.errorKey.set('');
    this.isSubmitting.set(true);
    this.loadingService.show();

    // The published demo is static files: nothing there can answer a POST, so
    // signing in would always fail against it. This is the same flag the route
    // guard uses, and the only two places in the app that read it — every
    // other build posts to the real API below.
    if (environment.demoAccess) {
      this.rememberIdentifier(identifier, !!remember);
      this.isSubmitting.set(false);
      this.loadingService.hide();
      this.routes.navigate(['/']);
      return;
    }

    this.service.login({ username: identifier, password: String(password ?? '') }).subscribe({
      next: () => {
        this.rememberIdentifier(identifier, !!remember);
        this.isSubmitting.set(false);
        this.loadingService.hide();
        this.routes.navigate(['/']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.loadingService.hide();
        this.errorKey.set(this.messageFor(error?.status));
      },
    });
  }

  /** The identifier only — a password is never written to storage. */
  private rememberIdentifier(identifier: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(REMEMBERED_IDENTIFIER, identifier);
    } else {
      localStorage.removeItem(REMEMBERED_IDENTIFIER);
    }
  }

  /**
   * One message for every failure told the merchant nothing — a wrong password
   * and an unreachable server need different reactions. The server's status is
   * what separates them.
   */
  private messageFor(status: number | undefined): string {
    switch (status) {
      case 0:
        return 'auth.errors.offline';
      case 400:
      case 401:
        return 'auth.errors.invalid';
      case 403:
        return 'auth.errors.disabled';
      case 429:
        return 'auth.errors.too_many';
      default:
        return status && status >= 500 ? 'auth.errors.server' : 'auth.errors.generic';
    }
  }
}
