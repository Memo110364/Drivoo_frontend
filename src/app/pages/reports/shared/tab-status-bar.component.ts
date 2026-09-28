import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-tab-status-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule, MaterialModule],
  template: `
    <div class="tab-status-bar d-flex align-items-center justify-content-end flex-wrap gap-12 m-b-20 p-12 px-16 rounded border border-primary-subtle">
      <div class="d-flex align-items-center gap-8">
        
        <div class="d-flex flex-wrap align-items-center gap-6 f-s-13">
          <span class="text-muted f-w-500">{{ 'reports.last_updated' | translate }}:<br>
          @if (lastUpdated) {
              {{ lastUpdated | date:'yyyy/MM/dd, hh:mm:ss a' }}
          } @else {
            {{ 'reports.not_updated_yet' | translate }}
          }
          </span>
        </div>
      </div>

      <button mat-flat-button color="primary" class="refresh-action-btn"
              (click)="refresh.emit()" [disabled]="loading">
        <span class="d-flex align-items-center gap-6">
          <i class="iconify f-s-16" [class.spin-animation]="loading" data-icon="solar:refresh-linear"></i>
          
        </span>
      </button>
    </div>
  `,
  styles: [`
    .tab-status-bar {
      border: 1px solid rgba(var(--mat-sys-primary, 93, 135, 255), 0.15) !important;
      transition: all 0.2s ease-in-out;
    }
    .status-indicator {
      width: 32px;
      height: 32px;
    }
    .refresh-action-btn {
      border-radius: 8px;
      font-weight: 500;
      padding: 0px;
    }
    .spin-animation {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }
    .dir-ltr {
      direction: ltr;
      display: inline-block;
    }
  `],
})
export class TabStatusBarComponent {
  @Input() lastUpdated: Date | null = null;
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();
}
