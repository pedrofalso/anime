import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AnimeService, AnimeItem } from '../services/anime.service';
import { AuthService, Comment } from '../services/auth';

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
  userRating: number = 0;
  watchedEpisodes: number = 0;

  comments: any[] = [];
  recommendations: AnimeItem[] = [];
  newComment: string = '';
  isGuest: boolean = false;
  safeTrailerUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private animeService: AnimeService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAnimeDetails(id);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  ionViewWillEnter() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isGuest = !this.authService.getCurrentUser()?.email; // Simple check for guest
    if (this.anime) {
      this.checkUserLists();
    }
  }

  loadAnimeDetails(id: string) {
    this.animeService.getById(id).subscribe({
      next: (data) => {
        this.anime = data;
        this.loading = false;
        this.checkUserLists();
        this.loadComments();
        this.loadRecommendations(id);
        if (this.anime.trailerUrl) {
          this.safeTrailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.anime.trailerUrl);
        }
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  async loadComments() {
    if (!this.anime) return;
    this.comments = await this.authService.getComments(this.anime.id);
  }

  loadRecommendations(id: string) {
    this.animeService.getRecommendations(id).subscribe(recs => {
      this.recommendations = recs;
    });
  }

  async sendComment() {
    if (!this.newComment.trim() || !this.anime) return;
    
    if (this.isGuest) {
      this.showToast('Los invitados no pueden comentar. Por favor, inicia sesión.', 'warning');
      return;
    }

    const success = await this.authService.addComment(this.anime.id, this.newComment, this.userRating);
    if (success) {
      this.showToast('Comentario publicado con éxito.', 'success');
      this.newComment = '';
      this.loadComments();
    } else {
      this.showToast('Error al publicar el comentario. Revisa tu conexión.', 'danger');
    }
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  async checkUserLists() {
    if (!this.isLoggedIn || !this.anime) return;
    const lists = await this.authService.getUserLists();
    
    this.isFavorite = !!lists.favorites.find(a => a.id === this.anime!.id);

    const categories: (keyof typeof lists)[] = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
    this.currentCategory = '';
    this.watchedEpisodes = 0;
    for (const cat of categories) {
      const found = lists[cat]?.find(a => a.id === this.anime!.id);
      if (found) {
        this.currentCategory = cat;
        this.userRating = found.rating || 0;
        this.watchedEpisodes = found.watched_episodes || 0;
        break;
      }
    }
  }

  async onCategoryChange(event: any) {
    if (!this.isLoggedIn || !this.anime) return;
    const value = event.detail.value;
    
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
        watched_episodes: this.watchedEpisodes,
        rating: this.userRating
      });
      this.currentCategory = value;
    } else {
      this.currentCategory = '';
    }
  }

  async toggleFavorite() {
    if (!this.isLoggedIn || !this.anime) return;
    if (this.isFavorite) {
      await this.authService.removeFromList('favorites', this.anime.id);
      this.isFavorite = false;
    } else {
      await this.authService.addToList('favorites', {
        id: this.anime.id,
        title: this.anime.title,
        image: this.anime.image,
        episodes: this.anime.episodes || 0
      });
      this.isFavorite = true;
    }
  }

  async setRating(val: number) {
    if (!this.isLoggedIn || !this.anime || !this.currentCategory) return;
    this.userRating = val;
    await this.authService.addToList(this.currentCategory as any, {
      id: this.anime.id,
      title: this.anime.title,
      image: this.anime.image,
      episodes: this.anime.episodes || 0,
      watched_episodes: this.watchedEpisodes,
      rating: this.userRating
    });
  }

  async incrementEpisode() {
    if (!this.anime || this.watchedEpisodes >= (this.anime.episodes || 999)) return;
    this.watchedEpisodes++;
    await this.updateEpisodesInDb();
  }

  async decrementEpisode() {
    if (this.watchedEpisodes <= 0) return;
    this.watchedEpisodes--;
    await this.updateEpisodesInDb();
  }

  private async updateEpisodesInDb() {
    if (!this.anime || !this.isLoggedIn) return;
    
    if (this.currentCategory) {
      await this.authService.updateWatchedEpisodes(this.anime.id, this.watchedEpisodes);
      
      // Auto-complete if episodes match
      if (this.anime.episodes > 0 && this.watchedEpisodes === this.anime.episodes && this.currentCategory !== 'completed') {
        await this.authService.addToList('completed', {
          id: this.anime.id,
          title: this.anime.title,
          image: this.anime.image,
          episodes: this.anime.episodes,
          watched_episodes: this.watchedEpisodes,
          rating: this.userRating
        });
        this.currentCategory = 'completed';
        this.showToast('¡Anime completado!', 'success');
      }
    } else {
      // If not in a list, add to watching by default
      await this.authService.addToList('watching', {
        id: this.anime.id,
        title: this.anime.title,
        image: this.anime.image,
        episodes: this.anime.episodes || 0,
        watched_episodes: this.watchedEpisodes,
        rating: this.userRating
      });
      this.currentCategory = 'watching';
    }
  }

  // Replaced by safeTrailerUrl variable to avoid re-render loops
  /*
  getSafeTrailerUrl(): SafeResourceUrl | null { ... }
  */
}
