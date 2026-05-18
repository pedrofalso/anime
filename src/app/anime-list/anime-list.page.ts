import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AnimeService, AnimeItem } from '../services/anime.service';
import { AuthService, User, UserLists } from '../services/auth';

interface AnimeCategory {
  title: string;
  items: AnimeItem[];
}

@Component({
  selector: 'app-anime-list',
  templateUrl: './anime-list.page.html',
  styleUrls: ['./anime-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule, RouterModule]
})
export class AnimeListPage implements OnInit {

  searchQuery = '';
  selectedGenre = '';
  selectedStatus = '';
  searchResults: AnimeItem[] = [];
  isSearching = false;

  categories: AnimeCategory[] = [];
  topEpisodes: AnimeItem[] = [];
  mostAiring: AnimeItem[] = [];
  popularMonth: AnimeItem[] = [];
  loading = true;
  error = false;

  isLoggedIn = false;
  user: User | null = null;
  userLists: UserLists = { watching: [], completed: [], onHold: [], dropped: [], planToWatch: [], favorites: [] };

  // Genres (MAL IDs)
  genres = [
    { id: '1', name: 'Acción' },
    { id: '2', name: 'Aventura' },
    { id: '4', name: 'Comedia' },
    { id: '8', name: 'Drama' },
    { id: '10', name: 'Fantasía' },
    { id: '22', name: 'Romance' },
    { id: '24', name: 'Sci-Fi' },
    { id: '36', name: 'Recuentos de la vida' },
    { id: '37', name: 'Sobrenatural' }
  ];

  constructor(private animeService: AnimeService, private router: Router, private authService: AuthService) { }

  ngOnInit() {
    this.loadCatalog();
  }

  async ionViewWillEnter() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.user = this.authService.getCurrentUser();
    if (this.isLoggedIn) {
      this.userLists = await this.authService.getUserLists();
    }
  }

  private loadCatalog() {
    this.error = false;
    this.loading = true;
    
    let pending = 4;
    const checkDone = () => {
      pending--;
      if (pending === 0) {
        this.loading = false;
      }
    };

    const handleError = () => {
      this.error = true;
      checkDone();
    };

    this.categories = [
      { title: 'En emisión (Airing Now)', items: [] },
      { title: 'Más Populares (Top Trending)', items: [] },
      { title: 'Películas Populares', items: [] },
      { title: 'Próximos Estrenos (Upcoming)', items: [] }
    ];

    this.animeService.getAiringAnime().subscribe({
      next: (items) => {
        this.categories[0].items = items;
        this.mostAiring = [...items].slice(0, 6);
        checkDone();
      },
      error: handleError
    });

    this.animeService.getTopAnime().subscribe({
      next: (items) => {
        this.categories[1].items = items;
        this.popularMonth = [...items].slice(0, 6);
        this.topEpisodes = [...items].sort((a, b) => b.episodes - a.episodes).slice(0, 6);
        checkDone();
      },
      error: handleError
    });

    this.animeService.getTopMovies().subscribe({
      next: (items) => {
        this.categories[2].items = items;
        checkDone();
      },
      error: handleError
    });

    this.animeService.getUpcomingAnime().subscribe({
      next: (items) => {
        this.categories[3].items = items;
        checkDone();
      },
      error: handleError
    });
  }

  onFilterChange() {
    this.performSearch();
  }

  searchChanged(event: any) {
    this.searchQuery = event.target.value;
    this.performSearch();
  }

  private performSearch() {
    if (!this.searchQuery && !this.selectedGenre && !this.selectedStatus) {
      this.isSearching = false;
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    const params = {
      genres: this.selectedGenre,
      status: this.selectedStatus
    };

    this.animeService.searchAnime(this.searchQuery, params).subscribe({
      next: (items) => {
        this.searchResults = items;
      },
      error: () => {
        this.searchResults = [];
      }
    });
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedGenre = '';
    this.selectedStatus = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  filteredItems(items: AnimeItem[]) {
    return items; // No longer used for search, search handled by performSearch
  }

  viewAnime(anime: AnimeItem) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/anime', anime.id])
    );
    window.open(url, '_blank');
  }

  isFavorite(anime: AnimeItem): boolean {
    if (!this.isLoggedIn) return false;
    return !!this.userLists.favorites.find(a => a.id === anime.id);
  }

  async toggleFavorite(event: Event, anime: AnimeItem) {
    event.stopPropagation(); // Prevent opening the anime detail page
    if (!this.isLoggedIn) return;
    
    if (this.isFavorite(anime)) {
      await this.authService.removeFromList('favorites', anime.id);
      this.userLists.favorites = this.userLists.favorites.filter(a => a.id !== anime.id);
    } else {
      const newItem = {
        id: anime.id,
        title: anime.title,
        image: anime.image,
        episodes: anime.episodes || 0
      };
      await this.authService.addToList('favorites', newItem);
      this.userLists.favorites.push(newItem);
    }
  }
}