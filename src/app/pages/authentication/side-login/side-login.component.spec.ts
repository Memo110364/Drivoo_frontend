import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AppSideLoginComponent } from './side-login.component';

/**
 * The identifier rule and the error mapping — the two pieces of logic the
 * screen actually owns. One field has to take a mobile number or an email,
 * and a failure has to say which kind it was.
 */
describe('AppSideLoginComponent', () => {
  let component: AppSideLoginComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(AppSideLoginComponent).componentInstance;
  });

  const identifier = (value: string) => {
    component.form.controls.uname.setValue(value);
    return component.form.controls.uname.errors;
  };

  it('accepts every Egyptian mobile prefix', () => {
    for (const prefix of ['010', '011', '012', '015']) {
      expect(identifier(`${prefix}12345678`)).withContext(prefix).toBeNull();
    }
  });

  it('rejects a mobile number of the wrong length or prefix', () => {
    for (const bad of ['0101234567', '01312345678', '1012345678', '010123456789']) {
      expect(identifier(bad)).withContext(bad).toEqual({ phoneOrEmail: true });
    }
  });

  it('accepts an email in the same field', () => {
    expect(identifier('mahmoud@example.com')).toBeNull();
    expect(identifier('a.b-c@sub.example.co')).toBeNull();
  });

  it('rejects something that is neither', () => {
    for (const bad of ['mahmoud', 'a@b', '@example.com', 'not an address']) {
      expect(identifier(bad)).withContext(bad).toEqual({ phoneOrEmail: true });
    }
  });

  it('ignores surrounding spaces rather than failing on them', () => {
    expect(identifier('  01012345678  ')).toBeNull();
  });

  it('requires an identifier and a password', () => {
    expect(component.form.valid).toBeFalse();
    component.form.controls.uname.setValue('01012345678');
    expect(component.form.valid).toBeFalse();
    component.form.controls.password.setValue('secret');
    expect(component.form.valid).toBeTrue();
  });

  it('tells a wrong password apart from an unreachable server', () => {
    const message = (status: number | undefined) => component['messageFor'](status);
    expect(message(401)).toBe('auth.errors.invalid');
    expect(message(400)).toBe('auth.errors.invalid');
    expect(message(403)).toBe('auth.errors.disabled');
    expect(message(429)).toBe('auth.errors.too_many');
    expect(message(0)).toBe('auth.errors.offline');
    expect(message(500)).toBe('auth.errors.server');
    expect(message(503)).toBe('auth.errors.server');
    expect(message(undefined)).toBe('auth.errors.generic');
  });

  it('starts with the password hidden', () => {
    expect(component.showPassword()).toBeFalse();
  });

  it('prefills a remembered identifier and never a password', () => {
    localStorage.setItem('drivoo.login.identifier', '01112223344');
    const fresh = TestBed.createComponent(AppSideLoginComponent).componentInstance;
    expect(fresh.form.controls.uname.value).toBe('01112223344');
    expect(fresh.form.controls.remember.value).toBeTrue();
    expect(fresh.form.controls.password.value).toBe('');
  });
});
