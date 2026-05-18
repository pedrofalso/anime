import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AnimeService, AnimeItem } from '../services/anime.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class HomePage implements OnInit {
  genres: any[] = [];
  featured: AnimeItem[] = [];
  upcoming: AnimeItem[] = [];
  loading = true;

  constructor(
    private animeService: AnimeService, 
    private router: Router,
    public notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.animeService.getGenres().subscribe(genres => {
      this.genres = genres.slice(0, 12); // Show top 12 genres
    });

    this.animeService.getTopAnime().subscribe(anime => {
      this.featured = anime.slice(0, 6);
    });

    this.animeService.getUpcomingAnime().subscribe(anime => {
      this.upcoming = anime.slice(0, 6);
      this.loading = false;
    });
  }

  getCountdown(date: string): string {
    return this.notificationService.getCountdown(date);
  }

  goToGenre(genreId: number) {
    this.router.navigate(['/anime-list'], { queryParams: { genre: genreId } });
  }

  goToAnimeList() {
    this.router.navigate(['/anime-list']);
  }

}
