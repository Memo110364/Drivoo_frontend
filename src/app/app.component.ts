import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoadingComponent } from './components/loading/loading.component';
import { CoreService, SUPPORTED_LANGUAGES } from './services/core.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, LoadingComponent],
    templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'Drivoo Dashboard';

  constructor() {
    const translate = inject(TranslateService);
    const core = inject(CoreService);

    // Bootstrap the language once, here, so no screen renders raw i18n keys.
    translate.addLangs(Object.keys(SUPPORTED_LANGUAGES));
    translate.setFallbackLang('en');
    translate.use(core.getLanguage());
  }
}
