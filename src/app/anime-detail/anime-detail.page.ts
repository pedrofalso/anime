import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AnimeService, AnimeItem } from '../services/anime.service';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-anime-detail',
  templateUrl: './anime-detail.page.html',
  styleUrls: ['./anime-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule]
})
export class AnimeDetailPage implements OnInit {
  anime: AnimeItem | null = null;
  loading = true;
  error = false;
                                                                                              
  isLoggedIn = false;
  currentCategory: string = '';
  isFavorite = false;
  isGuest = false;

  // Comments / rating
  comments: any[] = [];
  newComment: string = '';
  newCommentRating = 0;
  userRating = 0;

  // Episodes tracking
  watchedEpisodes = 0;
  watchedEpisodesList: number[] = [];
  episodesArray: number[] = [];
  recommendations: AnimeItem[] = [];
  // Cache trailer SafeResourceUrl to avoid recreating it every CD cycle
  safeTrailerUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private animeService: AnimeService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    await this.authService.ready;
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isGuest = this.authService.isGuestMode();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAnimeDetails(id);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  loadAnimeDetails(id: string) {
    this.animeService.getById(id).subscribe({
      next: async (data) => {
        this.anime = data;
        // build episodes array
        this.episodesArray = Array.from({ length: (this.anime?.episodes || 0) }, (_, i) => i + 1);
        // Cache trailer URL sanitized once
        this.safeTrailerUrl = this.anime?.trailerUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(this.anime.trailerUrl) : null;
        this.loading = false;
        await this.checkUserLists();
        await this.loadComments();
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  async checkUserLists() {
    if (!this.isLoggedIn || !this.anime) return;
    const lists = await this.authService.getUserLists();

    this.isFavorite = !!lists.favorites.find(a => String(a.id) === String(this.anime!.id));

    const categories: (keyof typeof lists)[] = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
    this.currentCategory = '';
    for (const cat of categories) {
      if (lists[cat] && lists[cat].find(a => String(a.id) === String(this.anime!.id))) {
        this.currentCategory = cat;
        const found = lists[cat].find(a => String(a.id) === String(this.anime!.id));
        this.watchedEpisodes = found?.watched_episodes || 0;
        this.watchedEpisodesList = [];
        for (let i = 1; i <= (this.watchedEpisodes || 0); i++) this.watchedEpisodesList.push(i);
        this.userRating = found?.rating || 0;
        break;
      }
    }
  }

  async onCategoryChange(event: any) {
    if (!this.isLoggedIn || !this.anime) return;
    const value = event.detail.value;

    console.log('onCategoryChange: ', value, 'anime id', this.anime?.id);

    // First remove from current if any
    if (this.currentCategory) {
      await this.authService.removeFromList(this.currentCategory as any, this.anime.id);
    }

    if (value) {
      await this.authService.addToList(value, {
        id: this.anime.id,
        title: this.anime.title,
        image: this.anime.image,
        episodes: this.anime.episodes || 0,
        rating: this.userRating || 0
      });
      console.log('onCategoryChange: added to', value);
      this.currentCategory = value;
    } else {
      this.currentCategory = '';
    }
  }

  async toggleFavorite() {
    if (!this.isLoggedIn || !this.anime) return;
    console.log('toggleFavorite: currently', this.isFavorite, 'for', this.anime?.id);
    if (this.isFavorite) {
      await this.authService.removeFromList('favorites', this.anime.id);
      this.isFavorite = false;
      console.log('toggleFavorite: removed favorite');
    } else {
      await this.authService.addToList('favorites', {
        id: this.anime.id,
        title: this.anime.title,
        image: this.anime.image,
        episodes: this.anime.episodes || 0
      });
      this.isFavorite = true;
      console.log('toggleFavorite: added favorite');
    }
  }

  // --- Rating and Comments ---
  async setRating(star: number) {
    if (!this.isLoggedIn || !this.anime) return;
    this.userRating = star;
    if (this.currentCategory) {
      await this.authService.addToList(this.currentCategory as any, {
        id: this.anime.id,
        title: this.anime.title,
        image: this.anime.image,
        episodes: this.anime.episodes || 0,
        rating: this.userRating
      });
    }
  }

  setCommentRating(star: number) {
    this.newCommentRating = star;
  }

  async sendComment() {
    if (!this.anime) return;
    if (!this.isLoggedIn) return;
    const success = await this.authService.addComment(String(this.anime.id), this.newComment.trim(), this.newCommentRating || undefined);
    if (success) {
      this.newComment = '';
      this.newCommentRating = 0;
      await this.loadComments();
    }
  }

  async loadComments() {
    if (!this.anime) return;
    this.comments = await this.authService.getComments(String(this.anime.id));
  }

  // --- Episodes tracking ---
  async toggleEpisode(ep: number) {
    if (!this.isLoggedIn || !this.anime || !this.currentCategory) return;
    const idx = this.watchedEpisodesList.indexOf(ep);
    if (idx === -1) {
      this.watchedEpisodesList.push(ep);
    } else {
      this.watchedEpisodesList.splice(idx, 1);
    }
    this.watchedEpisodes = this.watchedEpisodesList.length;
    await this.authService.updateWatchedEpisodes(String(this.anime.id), this.watchedEpisodes);
  }

  async markAllEpisodes(mark: boolean) {
    if (!this.isLoggedIn || !this.anime || !this.currentCategory) return;
    if (mark) {
      this.watchedEpisodesList = this.episodesArray.slice();
    } else {
      this.watchedEpisodesList = [];
    }
    this.watchedEpisodes = this.watchedEpisodesList.length;
    await this.authService.updateWatchedEpisodes(String(this.anime.id), this.watchedEpisodes);
  }

  // safeTrailerUrl property is updated when the anime is loaded; template binds directly to it.
}
