import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode: boolean = false;
  private accentColor: string = 'blue';
  private readonly THEME_KEY = 'pedro_anime_theme';
  private readonly ACCENT_KEY = 'pedro_anime_accent';

  constructor() {
    this.loadTheme();
  }

  loadTheme() {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) {
      this.darkMode = saved === 'dark';
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkMode = prefersDark.matches;
    }

    const savedAccent = localStorage.getItem(this.ACCENT_KEY);
    if (savedAccent) {
      this.accentColor = savedAccent;
    }

    this.applyTheme();
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    localStorage.setItem(this.THEME_KEY, this.darkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  setAccentColor(color: string) {
    this.accentColor = color;
    localStorage.setItem(this.ACCENT_KEY, color);
    this.applyTheme();
  }

  isDarkMode(): boolean {
    return this.darkMode;
  }

  getAccentColor(): string {
    return this.accentColor;
  }

  private applyTheme() {
    document.body.classList.toggle('dark', this.darkMode);
    
    // Remove old themes
    document.body.classList.remove('theme-akatsuki', 'theme-sakura', 'theme-cyberpunk', 'theme-blue');
    
    // Add current theme
    if (this.accentColor !== 'blue') {
      document.body.classList.add(`theme-${this.accentColor}`);
    } else {
      document.body.classList.add('theme-blue');
    }
  }
}
