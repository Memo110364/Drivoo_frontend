import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { WithdrawDialogComponent, WithdrawDialogData } from './withdraw-dialog.component';
import { PaymentMethod, WithdrawalRules } from 'src/app/services/api/wallet.service';

/**
 * The rules that decide whether a withdrawal can be sent, and what it costs.
 * These are the numbers a merchant acts on, so they are checked directly.
 */
describe('WithdrawDialogComponent', () => {
  const rules: WithdrawalRules = {
    minimum_amount: 500,
    maximum_amount: null,
    fees: { bank_account: 15, vodafone_cash: 10, instapay: 0, cash: 0 },
    allow_concurrent_requests: false,
    transfer_days: [0, 2, 4],
    expected_days: 2,
  };

  const method = (id: string, type: string, isDefault = false): PaymentMethod => ({
    id,
    type,
    label: 'Holder',
    masked_identifier: '••••1234',
    details: {},
    is_default: isDefault,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  });

  function build(data: Partial<WithdrawDialogData> = {}): WithdrawDialogComponent {
    const full: WithdrawDialogData = {
      available: 10000,
      rules,
      methods: [method('pm1', 'bank_account', true), method('pm2', 'instapay')],
      ...data,
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: full },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    });
    return TestBed.runInInjectionContext(() => new WithdrawDialogComponent());
  }

  it('starts on the default payout method', () => {
    expect(build().methodId()).toBe('pm1');
  });

  it('falls back to the first method when none is marked default', () => {
    const component = build({ methods: [method('pm2', 'instapay')] });
    expect(component.methodId()).toBe('pm2');
  });

  it('takes the fee from the chosen method type, not a single flat rate', () => {
    const component = build();
    expect(component.fee()).toBe(15);
    component.methodId.set('pm2');
    expect(component.fee()).toBe(0);
  });

  it('shows what lands, not just what was asked for', () => {
    const component = build();
    component.amount.set(1000);
    expect(component.netAmount()).toBe(985);
  });

  it('never reports a negative net amount', () => {
    const component = build();
    component.amount.set(10);
    expect(component.netAmount()).toBe(0);
  });

  it('refuses an amount below the minimum', () => {
    const component = build();
    component.amount.set(499);
    expect(component.validationKey()).toBe('wallet.withdraw.errors.below_minimum');
  });

  it('refuses more than the available balance', () => {
    const component = build();
    component.amount.set(10001);
    expect(component.validationKey()).toBe('wallet.withdraw.errors.above_available');
  });

  it('refuses an amount the fee would swallow', () => {
    // Above the minimum is not enough on its own: a request that nets zero or
    // less is not a transfer worth making.
    const component = build({ rules: { ...rules, minimum_amount: 5 } });
    component.amount.set(15);
    expect(component.validationKey()).toBe('wallet.withdraw.errors.below_fee');
  });

  it('accepts an amount inside every rule', () => {
    const component = build();
    component.amount.set(5000);
    expect(component.validationKey()).toBe('');
    expect(component.isValid()).toBeTrue();
  });

  it('fills the amount with the whole available balance', () => {
    const component = build();
    component.useFullBalance();
    expect(component.amount()).toBe(10000);
    expect(component.isValid()).toBeTrue();
  });
});
