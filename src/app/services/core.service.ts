import { Injectable, signal } from '@angular/core';
import { AppSettings, defaults } from '../config';
import { BehaviorSubject, Observable } from 'rxjs';

/** Languages the UI ships translations for, and the direction each one needs. */
export const SUPPORTED_LANGUAGES: Record<string, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  private optionsSignal = signal<AppSettings>(defaults);
  private notify$ = new BehaviorSubject<Record<string, any>>({});

  constructor() {
    this.notify$.next(this.optionsSignal());
    this.applyDirection(this.getLanguage());
  }

  /** Keeps `<html lang>` and `<html dir>` in sync so RTL styles and fonts apply. */
  private applyDirection(language: string) {
    const dir = SUPPORTED_LANGUAGES[language] ?? 'ltr';
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', dir);
  }

  // Observable for notification updates
  get notify(): Observable<Record<string, any>> {
    return this.notify$.asObservable();
  }

  // Get the current options
  getOptions(): AppSettings {
    return this.optionsSignal();
  }

  setOptions(options: Partial<AppSettings>) {
    this.optionsSignal.update((current) => ({
      ...current,
      ...options,
    }));
    this.notify$.next(this.optionsSignal);
    
  }

  setLanguage(lang: string) {
    const language = lang in SUPPORTED_LANGUAGES ? lang : this.getLanguage();
    this.setOptions({ language, dir: SUPPORTED_LANGUAGES[language] });
    this.applyDirection(language);
  }

  getLanguage() {
    return this.getOptions().language;
  }
}
