import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plugin } from '../../../services/api/plugin.service';

@Component({
  selector: 'plugin-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class PluginCardComponent {
  plugin = input.required<Plugin>();

}
