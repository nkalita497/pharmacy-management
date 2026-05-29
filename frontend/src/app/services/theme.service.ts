import { Injectable, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.readLocal());

  constructor(private http: HttpClient) {
    effect(() => this.apply(this.theme()));
  }

  private readLocal(): ThemeMode {
    const t = localStorage.getItem('pharma-theme');
    return t === 'dark' ? 'dark' : 'light';
  }

  apply(theme: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pharma-theme', theme);
  }

  setTheme(theme: ThemeMode, persistServer = true): void {
    this.theme.set(theme);
    if (persistServer) {
      this.http.put(`${environment.apiUrl}/preferences`, { theme, locale: localStorage.getItem('pharma-locale') || 'pl' }).subscribe();
    }
  }

  loadFromServer(): void {
    this.http.get<{ theme: ThemeMode; locale: string }>(`${environment.apiUrl}/preferences`).subscribe({
      next: (p) => {
        if (p.theme) this.theme.set(p.theme);
        if (p.locale) localStorage.setItem('pharma-locale', p.locale);
      }
    });
  }
}
