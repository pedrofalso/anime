import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class AnimeListPage implements OnInit, OnDestroy {

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
  private listsSub: any;

  async ionViewWillEnter() {
    await this.authService.ready;
    this.isLoggedIn = this.authService.isLoggedIn();
    this.user = this.authService.getCurrentUser();
    if (this.isLoggedIn) {
      this.userLists = await this.authService.getUserLists();
    }
  }

  ngOnInit() {
    // already loads catalog in original ngOnInit; keep behavior and subscribe to list changes
    this.loadCatalog();
    this.listsSub = this.authService.listsChanged.subscribe(() => {
      this.authService.getUserLists().then(l => {
        this.userLists = l;
      }).catch(e => console.warn('Error refreshing userLists', e));
    });
  }

  ngOnDestroy() {
    if (this.listsSub && this.listsSub.unsubscribe) this.listsSub.unsubscribe();
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
    this.router.navigate(['/anime', anime.id]);
  }

  isFavorite(anime: AnimeItem): boolean {
    if (!this.isLoggedIn) return false;
    return !!this.userLists.favorites.find(a => String(a.id) === String(anime.id));
  }

  async toggleFavorite(event: Event, anime: AnimeItem) {
    event.stopPropagation(); // Prevent opening the anime detail page
    if (!this.isLoggedIn) return;
    console.log('anime-list.toggleFavorite clicked for', anime.id);
    
    if (this.isFavorite(anime)) {
      await this.authService.removeFromList('favorites', anime.id);
      this.userLists.favorites = this.userLists.favorites.filter(a => String(a.id) !== String(anime.id));
      console.log('anime-list.toggleFavorite removed', anime.id);
    } else {
      const newItem = {
        id: anime.id,
        title: anime.title,
        image: anime.image,
        episodes: anime.episodes || 0
      };
      await this.authService.addToList('favorites', newItem);
      this.userLists.favorites.push(newItem);
      console.log('anime-list.toggleFavorite added', anime.id);
    }
  }
}