import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, TablerIconsModule, MatButtonModule, MatIconModule],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss'],
})
export class AppCardsComponent {

  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input()  icon: string = '';
  @Input() color: string = '';
  @Input() percentage: string = '';
  constructor() {}
}
