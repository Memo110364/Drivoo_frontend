import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, TablerIconsModule, MatButtonModule, MatIconModule],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss'],
})
export class AppCardsComponent {

  @Input() title: string = '';
  /** Nullable because callers pass values straight through the `number` pipe. */
  @Input() subtitle: string | null = '';
  @Input()  icon: string = '';
  @Input() color: string = '';
  @Input() percentage: string = '';
  /** Change against the previous period. Leave null to hide the indicator. */
  @Input() delta: number | null = null;
  /** Unit appended to the delta, e.g. '%' for counts or 'pt' for rates. */
  @Input() deltaUnit: string = '%';
  /** For a metric where a rise is bad — returns, for instance — so the colour flips. */
  @Input() lowerIsBetter: boolean = false;
  /** Small line under the value: a share of total, or the comparison caption. */
  @Input() note: string = '';
  constructor() {}

  get deltaIcon(): string {
    if (this.delta === null || this.delta === 0) return 'tabler:minus';
    return this.delta > 0 ? 'tabler:trending-up' : 'tabler:trending-down';
  }

  get deltaClass(): string {
    if (this.delta === null || this.delta === 0) return 'text-muted';
    const good = this.lowerIsBetter ? this.delta < 0 : this.delta > 0;
    return good ? 'text-success' : 'text-error';
  }
}
