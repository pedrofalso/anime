import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User as SupabaseUser } from '@supabase/supabase-js';

// We map SupabaseUser to our User format
export interface User {
  id?: string;
  username: string;
  email?: string;
  joinDate?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  themeAccent?: string;
}

export interface AnimeListItem {
  id: string | number;
  title: string;
  image: string;
  episodes: number;
  watched_episodes?: number;
  rating?: number;
}

export interface UserLists {
  watching: AnimeListItem[];
  completed: AnimeListItem[];
  onHold: AnimeListItem[];
  dropped: AnimeListItem[];
  planToWatch: AnimeListItem[];
  favorites: AnimeListItem[];
}

export interface Comment {
  id?: string;
  anime_id: string;
  user_id: string;
  username: string;
  content: string;
  rating?: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: SupabaseUser | null = null;
  private userProfile: User | null = null;
  private isGuest: boolean = false;
  private readonly GUEST_LISTS_KEY = 'pedro_anime_guest_lists';

  constructor(private supabaseService: SupabaseService) {
    this.initSession();
  }

  private async initSession() {
    const { data } = await this.supabaseService.client.auth.getSession();
    this.currentUser = data.session?.user || null;
    if (this.currentUser) {
      await this.loadUserProfile();
    }
  }

  private async loadUserProfile() {
    if (!this.currentUser) return;

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', this.currentUser.id)
      .single();

    if (error || !data) {
      this.userProfile = {
        id: this.currentUser.id,
        username: this.currentUser.user_metadata['username'] || this.currentUser.email?.split('@')[0] || 'User',
        email: this.currentUser.email,
        joinDate: this.currentUser.created_at.split('T')[0],
        avatarUrl: '',
        bannerUrl: '',
        themeAccent: 'blue'
      };
    } else {
      this.userProfile = {
        id: data.id,
        username: data.username,
        email: this.currentUser.email,
        joinDate: this.currentUser.created_at.split('T')[0],
        avatarUrl: data.avatar_url,
        bannerUrl: data.banner_url,
        themeAccent: data.theme_accent
      };
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null || this.isGuest;
  }

  getCurrentUser(): User | null {
    if (this.isGuest) {
      return { username: 'Invitado', avatarUrl: '', joinDate: new Date().toISOString().split('T')[0] };
    }
    return this.userProfile;
  }

  loginAsGuest() {
    this.isGuest = true;
    this.currentUser = null;
    this.userProfile = null;
  }

  async login(username: string, password?: string): Promise<boolean> {
    // Use email format for Supabase
    const email = username.includes('@') ? username : `${username}@anime.local`;
    
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password: password || ''
    });

    if (error || !data.user) {
      console.error('Login error:', error);
      return false;
    }

    this.currentUser = data.user;
    this.userProfile = {
      username: data.user.user_metadata['username'] || username,
      email: data.user.email,
      joinDate: data.user.created_at.split('T')[0],
      avatarUrl: ''
    };
    return true;
  }

  async register(username: string, password?: string): Promise<{success: boolean, message?: string}> {
    const email = username.includes('@') ? username : `${username}@anime.local`;
    
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password: password || '',
      options: {
        data: {
          username: username
        }
      }
    });

    if (error) {
      console.error('Register error:', error);
      // Translate common Supabase errors to Spanish for better UX
      let errorMsg = error.message;
      if (errorMsg.includes('Password should contain')) {
        errorMsg = 'La contraseña debe contener al menos 6 caracteres, una mayúscula y un número.';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = 'Este usuario o correo ya está registrado.';
      } else if (errorMsg.includes('weak_password')) {
         errorMsg = 'Contraseña demasiado débil. Usa números y letras.';
      }
      return { success: false, message: errorMsg };
    }
    
    if (!data.user) {
      return { success: false, message: 'Error desconocido al crear el usuario.' };
    }
    
    return { success: true };
  }

  async logout(): Promise<void> {
    if (!this.isGuest) {
      await this.supabaseService.client.auth.signOut();
    }
    this.currentUser = null;
    this.userProfile = null;
    this.isGuest = false;
  }

  // --- List Management ---

  async getUserLists(userId?: string): Promise<UserLists> {
    const defaultLists: UserLists = { watching: [], completed: [], onHold: [], dropped: [], planToWatch: [], favorites: [] };
    
    if (this.isGuest && !userId) {
      const localStr = localStorage.getItem(this.GUEST_LISTS_KEY);
      return localStr ? JSON.parse(localStr) : defaultLists;
    }

    const targetUserId = userId || this.currentUser?.id;
    if (!targetUserId) return defaultLists;

    const { data, error } = await this.supabaseService.client
      .from('user_lists')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error fetching lists:', error);
      return defaultLists;
    }

    if (data) {
      data.forEach(item => {
        const anime: AnimeListItem = {
          id: item.anime_id,
          title: item.title,
          image: item.image,
          episodes: item.episodes,
          watched_episodes: item.watched_episodes || 0,
          rating: item.rating
        };
        const status = item.status as keyof UserLists;
        if (defaultLists[status]) {
          defaultLists[status].push(anime);
        }
      });
    }

    return defaultLists;
  }

  async addToList(listName: keyof UserLists, anime: AnimeListItem): Promise<void> {
    if (this.isGuest) {
      const lists = await this.getUserLists();
      
      // Remove from other lists if not favorites
      if (listName !== 'favorites') {
         const allLists = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
         for (const l of allLists) {
           if (l !== listName) {
             lists[l as keyof UserLists] = lists[l as keyof UserLists].filter(a => a.id !== anime.id);
           }
         }
      }

      // Add or update
      const existingIdx = lists[listName].findIndex(a => a.id === anime.id);
      if (existingIdx !== -1) {
        lists[listName][existingIdx] = { ...lists[listName][existingIdx], ...anime };
      } else {
        lists[listName].push(anime);
      }
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      return;
    }

    if (!this.currentUser) return;

    if (listName !== 'favorites') {
       const allLists = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
       for (const l of allLists) {
         if (l !== listName) {
           await this.removeFromList(l as keyof UserLists, anime.id);
         }
       }
    }

    const { error } = await this.supabaseService.client
      .from('user_lists')
      .upsert({
        user_id: this.currentUser.id,
        anime_id: anime.id.toString(),
        title: anime.title,
        image: anime.image,
        episodes: anime.episodes || 0,
        watched_episodes: anime.watched_episodes || 0,
        rating: anime.rating || 0,
        status: listName
      }, { onConflict: 'user_id, anime_id, status' });

    if (error) {
      console.error('Error adding to list:', error);
    }
  }

  async removeFromList(listName: keyof UserLists, animeId: string | number): Promise<void> {
    if (this.isGuest) {
      const lists = await this.getUserLists();
      lists[listName] = lists[listName].filter(a => a.id !== animeId);
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      return;
    }

    if (!this.currentUser) return;

    const { error } = await this.supabaseService.client
      .from('user_lists')
      .delete()
      .match({ 
        user_id: this.currentUser.id, 
        anime_id: animeId.toString(),
        status: listName 
      });

    if (error) {
      console.error('Error removing from list:', error);
    }
  }

  // --- Comments Management ---

  async getComments(animeId: string): Promise<Comment[]> {
    const { data, error } = await this.supabaseService.client
      .from('comments')
      .select('*')
      .eq('anime_id', animeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return data || [];
  }

  async addComment(animeId: string, content: string, rating?: number): Promise<boolean> {
    if (this.isGuest || !this.currentUser) return false;

    const insertData: any = {
      anime_id: animeId,
      user_id: this.currentUser.id,
      username: this.userProfile?.username || 'Usuario',
      content: content
    };

    if (rating !== undefined && rating !== null) {
      insertData.rating = rating;
    }

    const { error } = await this.supabaseService.client
      .from('comments')
      .insert(insertData);

    if (error) {
      console.error('Error adding comment:', error);
      
      // Fallback: If 'rating' column doesn't exist (error code 42703 in Postgres)
      if (error.code === '42703' || error.message.includes('rating')) {
        console.warn('The "rating" column might be missing in the "comments" table. Attempting without rating.');
        delete insertData.rating;
        const { error: retryError } = await this.supabaseService.client
          .from('comments')
          .insert(insertData);
        
        if (!retryError) return true;
      }
      return false;
    }

    return true;
  }

  // --- Public Profile Helpers ---

  async getUserByUsername(username: string): Promise<any | null> {
    // In Supabase auth, we don't usually have a public users table unless we create one.
    // However, we can search in our existing tables like 'comments' or 'user_lists' 
    // to find the user_id associated with a username.
    
    const { data, error } = await this.supabaseService.client
      .from('comments')
      .select('user_id, username')
      .eq('username', username)
      .limit(1)
      .single();

    if (error || !data) {
      // Try user_lists if not found in comments
      const { data: listData } = await this.supabaseService.client
        .from('user_lists')
        .select('user_id')
        .limit(1); // This is limited because we can't search by username in user_lists easily without a profiles table
        
      return null; // For now, we'll need a profiles table or similar for robust lookup
    }

    return data;
  }

  async updateWatchedEpisodes(animeId: string | number, episodes: number): Promise<void> {
    if (this.isGuest) {
      const lists = await this.getUserLists();
      for (const key in lists) {
        const list = lists[key as keyof UserLists];
        const anime = list.find(a => a.id === animeId);
        if (anime) {
          anime.watched_episodes = episodes;
        }
      }
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      return;
    }

    if (!this.currentUser) return;

    const { error } = await this.supabaseService.client
      .from('user_lists')
      .update({ watched_episodes: episodes })
      .match({ user_id: this.currentUser.id, anime_id: animeId.toString() });

    if (error) {
      console.error('Error updating episodes:', error);
    }
  }

  async getFullProfile(userId: string): Promise<User | null> {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return {
      id: data.id,
      username: data.username,
      avatarUrl: data.avatar_url,
      bannerUrl: data.banner_url,
      themeAccent: data.theme_accent
    };
  }

  async updateProfile(updates: Partial<User>): Promise<boolean> {
    if (!this.currentUser) return false;

    const { error } = await this.supabaseService.client
      .from('profiles')
      .upsert({
        id: this.currentUser.id,
        username: updates.username || this.userProfile?.username,
        avatar_url: updates.avatarUrl || this.userProfile?.avatarUrl,
        banner_url: updates.bannerUrl || this.userProfile?.bannerUrl,
        theme_accent: updates.themeAccent || this.userProfile?.themeAccent,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    await this.loadUserProfile();
    return true;
  }

  async uploadImage(path: string, file: File): Promise<string | null> {
    const { data, error } = await this.supabaseService.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = this.supabaseService.client.storage
      .from('avatars')
      .getPublicUrl(path);

    return publicUrl;
  }
}
