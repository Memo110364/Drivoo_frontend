import {
  Component,
  OnInit,
  ViewChild,
  ViewContainerRef,
  EnvironmentInjector,
  ChangeDetectorRef,
  inject,
  runInInjectionContext,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Plugin, PluginsService } from '../../../services/api/plugin.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-plugin-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatCard,MatButtonModule, MatCardContent, MatProgressSpinner],
  templateUrl: 'plugin-details.component.html',
  styleUrls: ['./plugin-details.component.scss']
})
export class PluginDetailsComponent implements OnInit {
  @ViewChild('container', { read: ViewContainerRef, static: true }) container!: ViewContainerRef;
  plugin = signal<any>(null);
  isLoaded = signal(true);
  hasError = signal(false);
  imgError = signal(false);
  componentInputs: Record<string, any> = {};
public translate = inject(TranslateService);
isSubscribing = signal(false);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(EnvironmentInjector);
  private snackBar = inject(MatSnackBar);
  private pluginService = inject(PluginsService);

  async ngOnInit() {
    this.loadPlugin();
    
  }
  onImageError(): void {
    this.imgError.set(true);
  }
  async loadPlugin(){
  try {
      const slug =  this.route.snapshot.paramMap.get('slug')??'';

      //get plugin data
      this.pluginService.getPlugin(slug).subscribe({
        next: (plugin) => {
          
          this.plugin.set(plugin);
        },
        error: () => {
          this.hasError.set(true);
        },
      });
      //check if remote is exist
    
      // 1. تحميل الموديول
      const m = await loadRemoteModule(slug, './Component');
      const TargetComponent = m.PluginDetailsComponent;
      

      // 2. تفريغ الحاوية
      this.container.clear();
      if (!TargetComponent) {
        // this.snackBar.open(this.translate.instant('plugins.plugin_not_found'), this.translate.instant('system_messages.close'), {
        //   duration: 3000,
        // });
        return;
      }
      // 3. إنشاء الكومبوننت داخل الـ Injection Context لضمان عمل inject()
      const componentRef = runInInjectionContext(this.injector, () => {
        return this.container.createComponent(TargetComponent, {
          environmentInjector: this.injector
        });
      });

      // 4. تمرير الـ Inputs لو موجودة دايركت على الـ Instance
      // if (this.componentInputs) {
        // (componentRef.instance as any).id = this.componentInputs['id'];
      // }

      this.cdr.detectChanges();
      
     this.isLoaded.set(false);
    } catch (err) {
      this.hasError.set(true);
      console.error('Failed to load remote component dynamically:', err);
    }
}

getCategoryIcon(): string {
    return 'solar:widget-add-bold-duotone';
  }

  getCategoryName(): string {
    const p = this.plugin();
    if (!p) return '';
    const currentLang = this.translate.currentLang || this.translate.defaultLang || 'ar';
    if(currentLang=="ar"){
      return p.category_ar;
    }else{
      return p.category_en;
    }
  }
  handleSubscribe(): void {
    const p = this.plugin();
    if (!p) return;

    this.isSubscribing.set(true);
    this.pluginService.subscribePlugin(p.slug).subscribe({
      next: () => {
        this.plugin.update((curr) => (curr ? { ...curr, is_active: true } : curr));
        this.isSubscribing.set(false);
        this.snackBar.open(
          this.translate.instant('plugins.subscribe_success'),
          this.translate.instant('system_messages.close'),
          { duration: 4000 }
        );
        this.loadPlugin();
      },
      error: () => {
        this.isSubscribing.set(false);
        this.loadPlugin();
      },
      
    });
  }

  handleUnsubscribe(): void {
    const p = this.plugin();
    if (!p) return;

    this.isSubscribing.set(true);
    this.pluginService.unsubscribePlugin(p.slug).subscribe({
      next: () => {
        this.plugin.update((curr) => (curr ? { ...curr, is_active: false } : curr));
        this.isSubscribing.set(false);
        this.snackBar.open(
          this.translate.instant('plugins.unsubscribe_success'),
          this.translate.instant('system_messages.close'),
          { duration: 4000 }
        );
        this.loadPlugin();
      },
      error: () => {
        this.isSubscribing.set(false);
        this.loadPlugin();
      },
    });
  }

}