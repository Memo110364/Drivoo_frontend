import { EnvironmentInjector, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AddMethodDialogComponent } from './add-method-dialog.component';
import { WalletService, WithdrawalMethodConfig } from 'src/app/services/api/wallet.service';

const MOCK_METHODS: WithdrawalMethodConfig[] = [
  {
    id: 1,
    name: 'Bank Account',
    icon: 'solar:card-linear',
    minimum_request: 1000,
    fields: [
      { key: 'name', name: 'Name', rule: 'required|string', type: 'text', regex: '/^[a-z]+/', values: null, required: true },
      { key: 'Number', name: 'Account Number', rule: 'required|int', type: 'number', regex: '/^[0-9]+/', values: null, required: true },
    ],
  },
  {
    id: 2,
    name: 'E-Wallet',
    icon: 'solar:smartphone-linear',
    minimum_request: 100,
    fields: [
      { key: 'name', name: 'Name', rule: 'required|string', type: 'text', regex: '/^[a-z]+/', values: null, required: true },
      { key: 'Number', name: 'Wallet Number', rule: ['required', 'App\\Rules\\Phone'], type: 'number', regex: '/^[0-9]+/', values: null, required: true },
    ],
  },
];

describe('AddMethodDialogComponent', () => {
  let component: AddMethodDialogComponent;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new AddMethodDialogComponent());
    httpTesting.expectOne((r) => r.url.includes('finance/method')).flush({
      data: MOCK_METHODS,
    });
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('asks for a method before anything else', () => {
    expect(component.validationKey()).toBe('wallet.add_method.errors.no_type');
  });

  it('populates methods from finance/method', () => {
    expect(component.methods().length).toBe(2);
    expect(component.isLoadingMethods()).toBeFalse();
  });

  it('selects a method and validates required fields', () => {
    component.selectMethod(MOCK_METHODS[0]);
    expect(component.selectedMethod()?.id).toBe(1);
    expect(component.isValid()).toBeFalse();

    component.onFieldChange('name', 'mahmoud');
    component.onFieldChange('Number', '12345678');
    expect(component.isValid()).toBeTrue();
  });

  it('validates phone numbers for wallet', () => {
    component.selectMethod(MOCK_METHODS[1]);
    component.onFieldChange('name', 'mahmoud');
    component.onFieldChange('Number', '01012345678');
    expect(component.isValid()).toBeTrue();

    component.onFieldChange('Number', '01312345678');
    expect(component.isValid()).toBeFalse();
  });

  it('sets is_default to true and disables unchecking when no existing methods', () => {
    expect(component.isFirstMethod()).toBeTrue();
    expect(component.isDefault()).toBeTrue();
  });

  it('submits with is_default in payload', () => {
    component.selectMethod(MOCK_METHODS[0]);
    component.onFieldChange('name', 'mahmoud');
    component.onFieldChange('Number', '12345678');
    component.submit();

    const req = httpTesting.expectOne((r) => r.url.includes('payment-methods') && r.method === 'POST');
    expect(req.request.body.is_default).toBeTrue();
    expect(req.request.body.method_id).toBe(1);
    req.flush({ message: 'Saved' });
  });

  it('allows changing is_default when existing methods exist', () => {
    const customInjector = Injector.create({
      providers: [
        { provide: WalletService, useValue: TestBed.inject(WalletService) },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { existingCount: 2 } },
      ],
      parent: TestBed.inject(EnvironmentInjector),
    });
    const dialogWithData = runInInjectionContext(customInjector, () => new AddMethodDialogComponent());
    httpTesting.expectOne((r) => r.url.includes('finance/method')).flush({
      data: MOCK_METHODS,
    });

    expect(dialogWithData.isFirstMethod()).toBeFalse();
    expect(dialogWithData.isDefault()).toBeFalse();
    dialogWithData.isDefault.set(true);
    expect(dialogWithData.isDefault()).toBeTrue();
  });
});


