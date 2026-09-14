import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { MaterialModule } from 'src/app/material.module';
import { WithdrawalRequest } from 'src/app/services/api/wallet.service';
import { downloadCsv } from '../../shared/csv-export';
import {
  METHOD_ICONS,
  WITHDRAWAL_STAGES,
  formatDate,
  formatDateTime,
  withdrawalStatusClass,
} from '../../shared/wallet-format';

/**
 * Withdrawal requests, with the stage each one has reached.
 *
 * The old screen showed a single "Success" pill, which says nothing while a
 * transfer is still moving — and nothing at all about why a rejected one was
 * rejected. Both are the merchant's actual questions, so both are answered here.
 */
@Component({
  selector: 'app-wallet-withdrawals',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, NgxSkeletonLoaderModule],
  templateUrl: './withdrawals.component.html',
  styleUrl: './withdrawals.component.scss',
})
export class WithdrawalsComponent {
  private translate = inject(TranslateService);

  @Input() rows: WithdrawalRequest[] = [];
  @Input() loading = false;
  @Input() currency = '';

  readonly stages = WITHDRAWAL_STAGES;
  readonly methodIcons = METHOD_ICONS;

  statusClass = withdrawalStatusClass;
  formatDate = formatDate;
  formatDateTime = formatDateTime;

  /** How far along a request is, as a step index the template renders. */
  reachedIndex(request: WithdrawalRequest): number {
    if (request.status === 'rejected') return -1;
    return this.stages.indexOf(request.status);
  }

  stageAt(request: WithdrawalRequest, stage: string): string {
    const entry = request.timeline.find((item) => item.stage === stage);
    return entry ? this.formatDateTime(entry.at) : '';
  }

  exportCsv(): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('wallet.withdrawals.code'),
      t('wallet.withdrawals.date'),
      t('wallet.withdrawals.method'),
      t('wallet.withdrawals.amount'),
      t('wallet.withdrawals.fee'),
      t('wallet.withdrawals.net'),
      t('wallet.withdrawals.status'),
      t('wallet.withdrawals.rejection_reason'),
    ];
    const body = this.rows.map((row) => [
      row.code,
      this.formatDateTime(row.created_at),
      `${t('wallet.method_type.' + row.method.type)} — ${row.method.label}`,
      row.amount,
      row.fee,
      row.net_amount,
      t(`wallet.withdrawal_status.${row.status}`),
      row.rejection_reason ?? '',
    ]);
    downloadCsv('drivoo-withdrawals', header, body);
  }
}
