import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { PerformanceTableComponent } from './performance-table.component';
import { PerformanceRow } from 'src/app/services/api/reports.service';

/**
 * Column order and the stock/rate thresholds — the rules a reviewer has to
 * trust. Built through an injection context rather than a fixture, since none
 * of this touches the template.
 */
describe('PerformanceTableComponent', () => {
  let component: PerformanceTableComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: { instant: (key: string) => key } }],
    });
    component = TestBed.runInInjectionContext(() => new PerformanceTableComponent());
  });

  const row = (over: Partial<PerformanceRow> = {}): PerformanceRow => ({
    key: 'p1',
    label: 'Product',
    orders: 100,
    shipped: 92,
    delivered: 70,
    returned: 10,
    delivery_success_rate: 87.5,
    return_rate: 12.5,
    avg_delivery_days: 3,
    revenue: 1000,
    ...over,
  });

  it('shows only the shared columns by default', () => {
    expect(component.columns).toEqual([
      'label',
      'orders',
      'shipped',
      'delivered',
      'returned',
      'delivery_success_rate',
      'return_rate',
      'avg_delivery_days',
    ]);
  });

  it('puts stock straight after the dimension, and revenue last', () => {
    component.showStock = true;
    component.showRevenue = true;
    expect(component.columns.slice(0, 3)).toEqual(['label', 'total_stock', 'current_stock']);
    expect(component.columns[component.columns.length - 1]).toBe('revenue');
  });

  it('reads current stock against the product own threshold', () => {
    expect(component.stockClass(row({ current_stock: 0, warning_stock_number: 20 })))
      .toBe('text-error');
    expect(component.stockClass(row({ current_stock: 20, warning_stock_number: 20 })))
      .toBe('text-warning');
    expect(component.stockClass(row({ current_stock: 21, warning_stock_number: 20 })))
      .toBe('text-success');
  });

  it('treats a missing stock figure as out of stock rather than healthy', () => {
    expect(component.stockClass(row())).toBe('text-error');
  });

  it('colours a rate on the same thresholds everywhere', () => {
    expect(component.rateClass(90)).toBe('text-success');
    expect(component.rateClass(89.9)).toBe('text-warning');
    expect(component.rateClass(74.9)).toBe('text-error');
  });
});
