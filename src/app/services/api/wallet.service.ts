import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

/**
 * The wallet API contract.
 *
 * Every figure a wallet screen shows comes from here; no component computes a
 * balance, a fee or an eligibility rule of its own. Where the backend does not
 * expose something yet it is listed in docs/backend-requirements.md rather
 * than invented in the frontend.
 */

/** How much a merchant holds, and when the rest of it becomes usable. */
export interface WalletBalance {
  currency: string;
  /** Everything the wallet holds, settled or not. */
  total: number;
  /** Delivered but not yet settled by the carrier — money on the way. */
  pending: number;
  /** Settled and withdrawable today. */
  available: number;
  /**
   * When the pending side becomes available, and how much of it. The single
   * most-asked question about a wallet, and the old screen could not answer it.
   */
  pending_releases: { date: string; amount: number; orders: number }[];
}

/** One line of the wallet ledger. */
export interface LedgerEntry {
  id: string;
  /** ISO timestamp. */
  date: string;
  /**
   * Backend enum code, translated by the UI: `order_payout`, `withdrawal`,
   * `shipping_fee`, `return_shipping`, `opening_balance`.
   */
  type: string;
  /** Signed: positive into the wallet, negative out of it. */
  amount: number;
  /** Running balance after this entry, so the ledger can be reconciled. */
  balance: number;
  /** Order code, invoice number or withdrawal code — whatever it belongs to. */
  reference: string;
  /** `order`, `invoice`, `withdrawal`, or empty. */
  reference_type: string;
}

export interface LedgerPage {
  page: number;
  limit: number;
  total: number;
  data: LedgerEntry[];
}

export interface LedgerQuery {
  from?: string;
  to?: string;
  /** One of the ledger type codes, or absent for every type. */
  type?: string;
  page?: number;
  limit?: number;
}

/** A place the merchant can be paid. */
export interface PaymentMethod {
  id: string;
  /** `bank_account`, `vodafone_cash`, `instapay` or `cash`. */
  type: string;
  /** Account holder, wallet owner, IPA address, or the branch for cash. */
  label: string;
  /**
   * The last few characters only. A full account number has no business being
   * on screen, and the merchant only needs enough to tell two accounts apart.
   */
  masked_identifier: string;
  /** Type-specific extras: bank name, branch, address. */
  details: Record<string, string>;
  is_default: boolean;
  /** `active`, `pending_verification` or `disabled`. */
  status: string;
  created_at: string;
}

/** A Drivoo branch a cash collection can be assigned to. */
export interface CashBranch {
  id: string;
  label: string;
  address: string;
  hours: string;
}

/** The business rules a withdrawal has to satisfy. */
export interface WithdrawalRules {
  minimum_amount: number;
  /** Null means no ceiling beyond the available balance. */
  maximum_amount: number | null;
  /** Flat transfer fee, keyed by payment method type. */
  fees: Record<string, number>;
  allow_concurrent_requests: boolean;
  /** Days of the week transfers go out. 0 is Sunday. */
  transfer_days: number[];
  /** Working days until the money lands, once approved. */
  expected_days: number;
}

/**
 * Whether a request can be opened, and if not, why.
 *
 * The reason is a code rather than a sentence, so the screen can translate it
 * and offer the way out — the old screen said "you can't request a money" and
 * left the merchant to guess.
 */
export interface WithdrawalEligibility {
  can_request: boolean;
  /** `request_in_progress`, `below_minimum`, `no_payment_method`, or null. */
  reason: string | null;
  /** The figures the reason's message needs, so no number is baked into a string. */
  context: Record<string, string | number>;
  available: number;
  next_transfer_date: string;
}

export interface WithdrawalOptions {
  rules: WithdrawalRules;
  eligibility: WithdrawalEligibility;
}

/** One stage a request has reached. */
export interface WithdrawalStage {
  /** `submitted`, `under_review`, `transferring`, `completed`. */
  stage: string;
  at: string;
}

export interface WithdrawalRequest {
  id: string;
  code: string;
  amount: number;
  fee: number;
  /** What actually lands, after the transfer fee. */
  net_amount: number;
  /** `submitted`, `under_review`, `transferring`, `completed`, `rejected`. */
  status: string;
  method: Pick<PaymentMethod, 'id' | 'type' | 'label' | 'masked_identifier'>;
  created_at: string;
  /** The stages reached so far, so the screen shows progress, not one pill. */
  timeline: WithdrawalStage[];
  expected_at?: string;
  rejection_reason?: string;
}

export interface WithdrawalsPage {
  page: number;
  limit: number;
  total: number;
  data: WithdrawalRequest[];
}

@Injectable({ providedIn: 'root' })
export class WalletService extends BaseService {
  private http = inject(HttpClient);

  getBalance(): Observable<WalletBalance> {
    return this.http.get<WalletBalance>(`${this.baseUrl}wallet/balance`);
  }

  getLedger(query: LedgerQuery = {}): Observable<LedgerPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<LedgerPage>(`${this.baseUrl}wallet/ledger`, { params });
  }

  getPaymentMethods(): Observable<{ data: PaymentMethod[] }> {
    return this.http.get<{ data: PaymentMethod[] }>(`${this.baseUrl}wallet/payment-methods`);
  }

  getCashBranches(): Observable<{ data: CashBranch[] }> {
    return this.http.get<{ data: CashBranch[] }>(`${this.baseUrl}wallet/cash-branches`);
  }

  addPaymentMethod(payload: Record<string, unknown>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}wallet/payment-methods`, payload);
  }

  deletePaymentMethod(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}wallet/payment-methods/${id}`);
  }

  setDefaultPaymentMethod(id: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}wallet/payment-methods/${id}/default`,
      {}
    );
  }

  getWithdrawals(): Observable<WithdrawalsPage> {
    return this.http.get<WithdrawalsPage>(`${this.baseUrl}wallet/withdrawals`);
  }

  /** Rules and eligibility together — the screen needs both to offer the form. */
  getWithdrawalOptions(): Observable<WithdrawalOptions> {
    return this.http.get<WithdrawalOptions>(`${this.baseUrl}wallet/withdrawal-options`);
  }

  requestWithdrawal(payload: {
    amount: number;
    payment_method_id: string;
  }): Observable<{ message: string; code: string }> {
    return this.http.post<{ message: string; code: string }>(
      `${this.baseUrl}wallet/withdrawals`,
      payload
    );
  }
}
