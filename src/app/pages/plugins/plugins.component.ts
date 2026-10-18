import { Component, signal, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PluginsService, Plugin } from '../../services/api/plugin.service';
import { PluginCardComponent } from 'src/app/components/plugins/card/card.component';
@Component({
  selector: 'app-plugins',
  imports: [PluginCardComponent],
  templateUrl: './plugins.component.html',
  styleUrl: './plugins.component.scss',
})
export class PluginsComponent implements OnInit {
plugins = signal<Plugin[]>([])
  isLoading = signal(false);
  pagination = signal({ page: 1, limit: 24, total: 0 });
  constructor(
    private pluginService: PluginsService,
    public translate: TranslateService
  ) {}
  ngOnInit(): void {
  this.getPlugins()
}
getPlugins(){
  this.isLoading.set(true)
  this.pluginService.getPlugins({page:1,limit:24}).subscribe((res) => {
    this.plugins.set(res.data)
    // this.pagination.set(res.pagination)
    this.isLoading.set(false)
  })
}
}
