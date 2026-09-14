import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AddMethodDialogComponent } from './add-method-dialog.component';

/**
 * Each payout type asks for its own fields, so each has its own rules. The
 * phone check in particular has to hold: a wrong wallet number is only
 * discovered when a transfer fails.
 */
describe('AddMethodDialogComponent', () => {
  let component: AddMethodDialogComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AddMethodDialogComponent());
    // The dialog asks for the branch list on construction.
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes('cash-branches')).flush({
      data: [{ id: 'br1', label: 'Nasr City', address: 'x', hours: 'y' }],
    });
  });

  it('asks for a type before anything else', () => {
    expect(component.validationKey()).toBe('wallet.add_method.errors.no_type');
  });

  it('accepts a complete bank account', () => {
    component.selectType('bank_account');
    component.holderName.set('Mahmoud Hassan');
    component.bankName.set('NBE');
    component.accountNumber.set('5078034905759382');
    expect(component.validationKey()).toBe('');
  });

  it('rejects an account number that is too short to be one', () => {
    component.selectType('bank_account');
    component.holderName.set('Mahmoud Hassan');
    component.bankName.set('NBE');
    component.accountNumber.set('1234');
    expect(component.validationKey()).toBe('wallet.add_method.errors.account_number');
  });

  it('accepts every Egyptian mobile prefix for a wallet', () => {
    component.selectType('vodafone_cash');
    component.holderName.set('Mahmoud');
    for (const prefix of ['010', '011', '012', '015']) {
      component.phone.set(`${prefix}12345678`);
      expect(component.validationKey()).withContext(prefix).toBe('');
    }
  });

  it('rejects a wallet number of the wrong length or prefix', () => {
    component.selectType('vodafone_cash');
    component.holderName.set('Mahmoud');
    for (const bad of ['0101234567', '01312345678', '1012345678', '010123456789']) {
      component.phone.set(bad);
      expect(component.validationKey()).withContext(bad).toBe('wallet.add_method.errors.phone');
    }
  });

  it('accepts an InstaPay handle or a mobile number', () => {
    component.selectType('instapay');
    component.holderName.set('Mahmoud');
    component.instapayAddress.set('mahmoud.hassan@instapay');
    expect(component.validationKey()).toBe('');
    component.instapayAddress.set('01012345678');
    expect(component.validationKey()).toBe('');
    component.instapayAddress.set('not an address');
    expect(component.validationKey()).toBe('wallet.add_method.errors.instapay');
  });

  it('needs a branch for a cash collection', () => {
    component.selectType('cash');
    component.holderName.set('Mahmoud');
    expect(component.validationKey()).toBe('wallet.add_method.errors.branch');
    component.cashBranchId.set('br1');
    expect(component.validationKey()).toBe('');
  });

  it('forgets the previous type when the merchant goes back', () => {
    component.selectType('vodafone_cash');
    component.back();
    expect(component.type()).toBe('');
  });
});
