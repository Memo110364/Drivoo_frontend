import { Injectable, signal } from '@angular/core';
import { AppSettings, defaults } from '../config';
import { BehaviorSubject, Observable } from 'rxjs';

/** Languages the UI ships translations for, and the direction each one needs. */
export const SUPPORTED_LANGUAGES: Record<string, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

const LANGUAGE_STORAGE_KEY = 'drivoo.language';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  private optionsSignal = signal<AppSettings>(CoreService.initialOptions());
  private notify$ = new BehaviorSubject<Record<string, any>>({});

  constructor() {
    this.notify$.next(this.optionsSignal());
    this.applyDirection(this.getLanguage());
  }

  /**
   * Direction has to be derived from the stored language here, not left at the
   * default. Otherwise a session saved in English still boots the layout in RTL,
   * because `dir` and `language` would disagree from the very first render.
   */
  private static initialOptions(): AppSettings {
    const language = CoreService.readStoredLanguage();
    return { ...defaults, language, dir: SUPPORTED_LANGUAGES[language] };
  }

  /** Falls back to the configured default when storage is empty or holds junk. */
  private static readStoredLanguage(): string {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && stored in SUPPORTED_LANGUAGES) return stored;
    } catch {
      // Private-mode browsers can throw on storage access; the default is fine.
    }
    return defaults.language;
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
    this.notify$.next(this.optionsSignal());
  }

  setLanguage(lang: string) {
    const language = lang in SUPPORTED_LANGUAGES ? lang : defaults.language;
    this.setOptions({ language, dir: SUPPORTED_LANGUAGES[language] });
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Nothing to do — the choice just will not survive a reload.
    }
    this.applyDirection(language);
  }

  getLanguage() {
    return this.getOptions().language;
  }

  /** Keeps `<html lang>` and `<html dir>` in sync so RTL styles and fonts apply. */
  private applyDirection(language: string) {
    const dir = SUPPORTED_LANGUAGES[language] ?? 'ltr';
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', dir);
  }
}
