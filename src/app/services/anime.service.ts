import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AnimeItem {
  id: string;
  title: string;
  image: string;
  episodes: number;
  score: number;
  status: string;
  synopsis?: string;
  season?: string;
  year?: number;
  airedString?: string;
  rank?: number;
  // Nuevos campos
  genres?: string[];
  studios?: string[];
  duration?: string;
  rating?: string;
  source?: string;
  trailerUrl?: string;
  background?: string;
  favorites?: number;
  popularity?: number;
  members?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnimeService {
  private readonly apiUrl = `${environment.apiUrl}`; // e.g. https://api.jikan.moe/v4

  constructor(private http: HttpClient) {}

  private mapResponse(response: any): AnimeItem[] {
    if (!response || !response.data) return [];
    return response.data.map((item: any) => ({
      id: String(item.mal_id),
      title: item.title || item.title_english || 'Sin título',
      image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
      episodes: item.episodes || 0,
      score: item.score || 0,
      status: item.status?.toLowerCase() || 'unknown',
      synopsis: item.synopsis || 'Sin sinopsis disponible.',
      season: item.season || 'Desconocido',
      year: item.year || null,
      airedString: item.aired?.string || 'Desconocido',
      rank: item.rank || 0,
      genres: item.genres?.map((g: any) => g.name) || [],
      studios: item.studios?.map((s: any) => s.name) || [],
      duration: item.duration || 'Desconocido',
      rating: item.rating || 'Desconocido',
      source: item.source || 'Desconocido',
      trailerUrl: item.trailer?.embed_url || '',
      background: item.background || '',
      favorites: item.favorites || 0,
      popularity: item.popularity || 0,
      members: item.members || 0
    }));
  }

  getTopAnime(): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/top/anime?limit=24`).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  getTopMovies(): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/top/anime?type=movie&limit=24`).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  getTopAiring(): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/top/anime?filter=airing&limit=24`).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  getAiringAnime(): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/seasons/now?limit=24`).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  getUpcomingAnime(): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/seasons/upcoming?limit=24`).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  // Fallback for search or full list if needed
  getAll(): Observable<AnimeItem[]> {
    return this.getTopAnime();
  }

  searchAnime(query: string, params: any = {}): Observable<AnimeItem[]> {
    let url = `${this.apiUrl}/anime?q=${encodeURIComponent(query)}`;
    
    if (params.genres) url += `&genres=${params.genres}`;
    if (params.status) url += `&status=${params.status}`;
    if (params.order_by) url += `&order_by=${params.order_by}`;
    if (params.sort) url += `&sort=${params.sort}`;
    if (params.limit) url += `&limit=${params.limit}`;
    else url += `&limit=24`;

    return this.http.get<any>(url).pipe(
      map((res) => this.mapResponse(res)),
      catchError(() => of([]))
    );
  }

  getById(id: string): Observable<AnimeItem> {
    return this.http.get<{ data: any }>(`${this.apiUrl}/anime/${id}/full`).pipe(
      map(response => {
        const item = response.data;
        return {
          id: String(item.mal_id),
          title: item.title || item.title_english || 'Sin título',
          image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
          episodes: item.episodes || 0,
          score: item.score || 0,
          status: item.status?.toLowerCase() || 'unknown',
          synopsis: item.synopsis || 'Sin sinopsis disponible.',
          season: item.season || 'Desconocido',
          year: item.year || null,
          airedString: item.aired?.string || 'Desconocido',
          rank: item.rank || 0,
          genres: item.genres?.map((g: any) => g.name) || [],
          studios: item.studios?.map((s: any) => s.name) || [],
          duration: item.duration || 'Desconocido',
          rating: item.rating || 'Desconocido',
          source: item.source || 'Desconocido',
          trailerUrl: item.trailer?.embed_url || '',
          background: item.background || '',
          favorites: item.favorites || 0,
          popularity: item.popularity || 0,
          members: item.members || 0
        };
      })
    );
  }

  getRecommendations(id: string): Observable<AnimeItem[]> {
    return this.http.get<any>(`${this.apiUrl}/anime/${id}/recommendations`).pipe(
      map((res: any) => {
        if (!res || !res.data) return [];
        return res.data.slice(0, 10).map((rec: any) => ({
          id: String(rec.entry.mal_id),
          title: rec.entry.title,
          image: rec.entry.images?.jpg?.image_url || '',
          score: 0,
          episodes: 0
        }));
      }),
      catchError(() => of([]))
    );
  }

  getGenres(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/genres/anime`).pipe(
      map(res => res.data || []),
      catchError(() => of([]))
    );
  }
}
