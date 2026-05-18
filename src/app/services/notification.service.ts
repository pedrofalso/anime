import { Injectable } from '@angular/core';
import { AnimeService, AnimeItem } from './anime.service';
import { AuthService } from './auth';
import { Observable, interval, map, startWith } from 'rxjs';

export interface EpisodeAlert {
  animeId: string;
  title: string;
  image: string;
  message: string;
  type: 'new-episode' | 'upcoming-countdown';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private animeService: AnimeService,
    private authService: AuthService
  ) {}

  getCountdown(upcomingDate: string): string {
    const target = new Date(upcomingDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return 'Ya disponible';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  async getNewEpisodeAlerts(): Promise<EpisodeAlert[]> {
    const userLists = await this.authService.getUserLists();
    const watching = userLists.watching;
    
    if (watching.length === 0) return [];

    // In a real app, we'd fetch the broadcast schedule from Jikan
    // and compare with the current time. For now, we'll simulate
    // checking which ones "might" have a new episode based on status.
    
    const alerts: EpisodeAlert[] = [];
    
    // Simulación: Algunos animes de "Viendo" tienen nuevo episodio hoy
    // En producción usaríamos: https://api.jikan.moe/v4/schedules
    
    return alerts;
  }
}
