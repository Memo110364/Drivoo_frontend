import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CoreService } from 'src/app/services/core.service';
import { ReportFilters } from 'src/app/services/api/reports.service';
import { OverviewTabComponent } from './tabs/overview-tab/overview-tab.component';
import { ShippingTabComponent } from './tabs/shipping-tab/shipping-tab.component';
import { ReturnsTabComponent } from './tabs/returns-tab/returns-tab.component';
import { ProductsTabComponent } from './tabs/products-tab/products-tab.component';
import { OperationsTabComponent } from './tabs/operations-tab/operations-tab.component';
import { StoresTabComponent } from './tabs/stores-tab/stores-tab.component';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` in local time — the format every reports endpoint expects. */
function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/** Total number of tabs, used to size the per-tab refresh trigger array. */
const TAB_COUNT = 6;

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    MatTabsModule,
    TranslateModule,
    OverviewTabComponent,
    ShippingTabComponent,
    ReturnsTabComponent,
    ProductsTabComponent,
    OperationsTabComponent,
    StoresTabComponent,
  ],
})
export class ReportsComponent implements OnInit {
  private coreService = inject(CoreService);
  private translate = inject(TranslateService);
  private dateAdapter = inject(DateAdapter);

  /**
   * Ranges a merchant actually reports on. Calendar months come first because
   * that is how a period is settled and reconciled; rolling windows follow.
   */
  readonly presets: { key: string; range: () => { from: Date; to: Date } }[] = [
    { key: 'this_month', range: () => ReportsComponent.monthRange(0) },
    { key: 'last_month', range: () => ReportsComponent.monthRange(-1) },
    { key: 'last_7_days', range: () => ReportsComponent.rollingRange(7) },
    { key: 'last_30_days', range: () => ReportsComponent.rollingRange(30) },
    { key: 'last_90_days', range: () => ReportsComponent.rollingRange(90) },
  ];
  activePreset = signal<string>('this_month');

  /** `offset` of 0 is the current month, -1 the previous one. */
  private static monthRange(offset: number): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const to =
      offset === 0 ? now : new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return { from, to };
  }

  private static rollingRange(days: number): { from: Date; to: Date } {
    return { from: new Date(Date.now() - (days - 1) * DAY_MS), to: new Date() };
  }

  fromDate = signal<Date>(ReportsComponent.monthRange(0).from);
  toDate = signal<Date>(ReportsComponent.monthRange(0).to);

  private fromApi = computed(() => toApiDate(this.fromDate()));
  private toApi = computed(() => toApiDate(this.toDate()));

  /** Passed down to each tab component as `[filters]`. */
  filters = computed<ReportFilters>(() => ({
    from: this.fromApi(),
    to: this.toApi(),
  }));

  /**
   * Index of the currently visible tab. Tracked so the refresh button only
   * invalidates the active tab's cache instead of every tab at once.
   */
  activeTabIndex = signal(0);

  /**
   * One independent refresh counter per tab. Bumping index N tells only
   * tab N to drop its cache and re-fetch; the other five are untouched.
   */
  readonly tabRefreshTriggers = Array.from({ length: TAB_COUNT }, () => signal(0));

  ngOnInit(): void {
    this.dateAdapter.setLocale(this.coreService.getLanguage() === 'ar' ? 'ar-EG' : 'en-GB');
  }

  applyPreset(preset: { key: string; range: () => { from: Date; to: Date } }): void {
    const { from, to } = preset.range();
    this.activePreset.set(preset.key);
    this.fromDate.set(from);
    this.toDate.set(to);
  }

  onDateChange(which: 'from' | 'to', value: Date | null): void {
    if (!value) return;
    this.activePreset.set('');
    (which === 'from' ? this.fromDate : this.toDate).set(value);
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  /**
   * Bumps the refresh counter for the currently visible tab only.
   * The tab component sees the change in ngOnChanges, wipes its own cache
   * entry, and re-fetches from the API.
   */
  triggerRefresh(): void {
    this.tabRefreshTriggers[this.activeTabIndex()].update((v) => v + 1);
  }
}
