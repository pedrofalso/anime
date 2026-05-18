import { Injectable, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
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
  private _isGuest: boolean = false;
  private readonly GUEST_LISTS_KEY = 'pedro_anime_guest_lists';
  private readonly GUEST_COMMENTS_KEY = 'pedro_guest_can_comment';
  private readonly GUEST_MODE_KEY = 'pedro_guest_mode';

  public ready: Promise<void>;
  // Emits when user's lists change (add/remove/update)
  public listsChanged: Subject<void> = new Subject<void>();

  private getDefaultLists(): UserLists {
    return { watching: [], completed: [], onHold: [], dropped: [], planToWatch: [], favorites: [] };
  }

  private getLocalListStorageKey(userId?: string): string {
    return userId ? `${this.GUEST_LISTS_KEY}_${userId}` : this.GUEST_LISTS_KEY;
  }

  private getLocalLists(userId?: string): UserLists {
    const localStr = localStorage.getItem(this.getLocalListStorageKey(userId));
    return localStr ? JSON.parse(localStr) : this.getDefaultLists();
  }

  private saveLocalLists(lists: UserLists, userId?: string): void {
    localStorage.setItem(this.getLocalListStorageKey(userId), JSON.stringify(lists));
  }

  constructor(private supabaseService: SupabaseService) {
    // Restore guest mode from localStorage so navigation/reloads keep guest state
    try {
      const g = localStorage.getItem(this.GUEST_MODE_KEY);
      if (g === '1') this._isGuest = true;
    } catch (e) {
      // ignore
    }

    this.ready = this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // 1. Fetch the initial session first to avoid lock contention
      const { data } = await this.supabaseService.client.auth.getSession();
      this.currentUser = data.session?.user || null;
      if (this.currentUser) {
        await this.loadUserProfile();
      }

      // 2. Register the listener ONLY AFTER the initial session is fully loaded
      this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        // Ignore token refresh events to avoid frequent reloads
        if (event === 'TOKEN_REFRESHED') return;

        // Only react to SIGNED_IN / SIGNED_OUT and USER_UPDATED
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          this.currentUser = session?.user || null;
          try {
            if (this.currentUser) {
              await this.loadUserProfile();
            } else {
              this.userProfile = null;
            }
          } catch (e) {
            console.error('Error during auth listener state change:', e);
          }
        }
      });
    } catch (e) {
      console.error('Error initializing auth:', e);
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
    return this.currentUser !== null || this._isGuest;
  }

  isGuestMode(): boolean {
    return this._isGuest;
  }

  getCurrentUser(): User | null {
    if (this._isGuest) {
      return { username: 'Invitado', avatarUrl: '', joinDate: new Date().toISOString().split('T')[0] };
    }
    return this.userProfile;
  }

  loginAsGuest() {
    this._isGuest = true;
    this.currentUser = null;
    this.userProfile = null;
    try {
      localStorage.setItem(this.GUEST_MODE_KEY, '1');
    } catch (e) {}
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
    await this.loadUserProfile();
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
    if (!this._isGuest) {
      await this.supabaseService.client.auth.signOut();
    }
    this.currentUser = null;
    this.userProfile = null;
    this._isGuest = false;
    try { localStorage.removeItem(this.GUEST_MODE_KEY); } catch (e) {}
  }

  // --- List Management ---

  async getUserLists(userId?: string): Promise<UserLists> {
    const defaultLists: UserLists = { watching: [], completed: [], onHold: [], dropped: [], planToWatch: [], favorites: [] };
    
    if (this._isGuest && !userId) {
      return this.getLocalLists();
    }

    const targetUserId = userId || this.currentUser?.id;
    if (!targetUserId) return defaultLists;

    const { data, error } = await this.supabaseService.client
      .from('user_lists')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error fetching lists:', error);
      const fallback = this.getLocalLists(targetUserId);
      if (fallback && Object.values(fallback).some(list => list.length > 0)) {
        console.log('getUserLists: using local fallback lists for', targetUserId);
        return fallback;
      }
      return defaultLists;
    }

    if (data && data.length === 0) {
      const fallback = this.getLocalLists(targetUserId);
      if (fallback && Object.values(fallback).some(list => list.length > 0)) {
        console.log('getUserLists: using local fallback lists when no remote rows found for', targetUserId);
        return fallback;
      }
    }

    if (data) {
      console.log('getUserLists: fetched', data.length, 'rows for', targetUserId);
      const normalizeStatus = (s: string): keyof UserLists | null => {
        if (!s) return null;
        const lower = s.toLowerCase();
        if (lower === 'watching' || lower === 'viendo') return 'watching';
        if (lower === 'completed' || lower === 'completed' || lower === 'completed') return 'completed';
        if (lower === 'onhold' || lower === 'on_hold' || lower === 'on-hold') return 'onHold';
        if (lower === 'dropped' || lower === 'abandoned') return 'dropped';
        if (lower === 'plan_to_watch' || lower === 'ptw' || lower === 'plantowatch' || lower === 'plan to watch') return 'planToWatch';
        if (lower === 'favorites' || lower === 'favorite' || lower === 'favourites') return 'favorites';
        // try camelCase direct
        if (s === 'onHold' || s === 'planToWatch') return s as keyof UserLists;
        return null;
      };

      data.forEach(item => {
        // Normalize id to string so comparisons with API numeric ids work
        const anime: AnimeListItem = {
          id: String(item.anime_id),
          title: item.title,
          image: item.image,
          episodes: item.episodes,
          watched_episodes: item.watched_episodes || 0,
          rating: item.rating
        };
        const rawStatus = item.status || '';
        const status = normalizeStatus(String(rawStatus));
        if (status && defaultLists[status]) {
          defaultLists[status].push(anime);
        } else {
          console.warn('getUserLists: unknown status', rawStatus);
        }
      });
    }

    console.log('getUserLists: returning lists for', targetUserId, defaultLists);
    return defaultLists;
  }

  async addToList(listName: keyof UserLists, anime: AnimeListItem): Promise<void> {
    const animeIdStr = String(anime.id);

    if (this._isGuest) {
      const lists = await this.getUserLists();
      
      // Remove from other lists if not favorites
      if (listName !== 'favorites') {
         const allLists = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
         for (const l of allLists) {
           if (l !== listName) {
             lists[l as keyof UserLists] = lists[l as keyof UserLists].filter(a => String(a.id) !== animeIdStr);
           }
         }
      }

      // Add or update
      const existingIdx = lists[listName].findIndex(a => String(a.id) === animeIdStr);
      if (existingIdx !== -1) {
        lists[listName][existingIdx] = { ...lists[listName][existingIdx], ...anime, id: animeIdStr };
      } else {
        lists[listName].push({ ...anime, id: animeIdStr });
      }
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      console.log('addToList (guest): saved lists to localStorage', lists);
      this.listsChanged.next();
      return;
    }

    if (!this.currentUser) return;

    const targetUserId = this.currentUser.id;
    const animeIdForDb: any = isNaN(Number(animeIdStr)) ? animeIdStr : Number(animeIdStr);

    if (listName !== 'favorites') {
       const allLists = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
       for (const l of allLists) {
         if (l !== listName) {
           await this.removeFromList(l as keyof UserLists, animeIdStr);
         }
       }
    }

    const insertPayload: any = {
      user_id: targetUserId,
      anime_id: animeIdForDb,
      title: anime.title,
      image: anime.image,
      episodes: anime.episodes || 0,
      watched_episodes: anime.watched_episodes || 0,
      rating: anime.rating || 0,
      status: listName
    };

    try {
      const { data: insertData, error } = await this.supabaseService.client
        .from('user_lists')
        .insert(insertPayload);

      if (error) {
        console.error('Error adding to list:', error, insertPayload);
        const fallbackLists = this.getLocalLists(targetUserId);
        const existingIdx = fallbackLists[listName].findIndex(a => String(a.id) === animeIdStr);
        if (existingIdx !== -1) {
          fallbackLists[listName][existingIdx] = { ...fallbackLists[listName][existingIdx], ...anime, id: animeIdStr };
        } else {
          fallbackLists[listName].push({ ...anime, id: animeIdStr });
        }
        this.saveLocalLists(fallbackLists, targetUserId);
        this.listsChanged.next();
      } else {
        console.log('addToList: inserted', insertData);
        this.saveLocalLists(await this.getUserLists(targetUserId), targetUserId);
        this.listsChanged.next();
      }
    } catch (e) {
      console.error('Exception in addToList:', e);
      const fallbackLists = this.getLocalLists(targetUserId);
      const existingIdx = fallbackLists[listName].findIndex(a => String(a.id) === animeIdStr);
      if (existingIdx !== -1) {
        fallbackLists[listName][existingIdx] = { ...fallbackLists[listName][existingIdx], ...anime, id: animeIdStr };
      } else {
        fallbackLists[listName].push({ ...anime, id: animeIdStr });
      }
      this.saveLocalLists(fallbackLists, targetUserId);
      this.listsChanged.next();
    }
  }

  async removeFromList(listName: keyof UserLists, animeId: string | number): Promise<void> {
    const animeIdStr = String(animeId);
    if (this._isGuest) {
      const lists = await this.getUserLists();
      lists[listName] = lists[listName].filter(a => String(a.id) !== animeIdStr);
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      console.log('removeFromList: updated guest lists', lists);
      this.listsChanged.next();
      return;
    }

    if (!this.currentUser) return;

    const targetUserId = this.currentUser.id;
    const animeIdForDb: any = isNaN(Number(animeIdStr)) ? animeIdStr : Number(animeIdStr);

    const { error } = await this.supabaseService.client
      .from('user_lists')
      .delete()
      .match({ 
        user_id: targetUserId, 
        anime_id: animeIdForDb,
        status: listName 
      });

    if (error) {
      console.error('Error removing from list:', error);
      const fallbackLists = this.getLocalLists(targetUserId);
      fallbackLists[listName] = fallbackLists[listName].filter(a => String(a.id) !== animeIdStr);
      this.saveLocalLists(fallbackLists, targetUserId);
      this.listsChanged.next();
    } else {
      console.log('removeFromList: removed', { user_id: targetUserId, anime_id: animeIdForDb, status: listName });
      const fallbackLists = this.getLocalLists(targetUserId);
      fallbackLists[listName] = fallbackLists[listName].filter(a => String(a.id) !== animeIdStr);
      this.saveLocalLists(fallbackLists, targetUserId);
      this.listsChanged.next();
    }
  }

  // --- Comments Management ---

  async getComments(animeId: string): Promise<Comment[]> {
    let remoteComments: Comment[] = [];
    try {
      const { data, error } = await this.supabaseService.client
        .from('comments')
        .select('*')
        .eq('anime_id', animeId);

      if (!error && data) {
        remoteComments = data;
      } else {
        console.warn('Error fetching comments from Supabase:', error);
      }
    } catch (e) {
      console.warn('Exception fetching comments from Supabase:', e);
    }

    // Get local comments
    const localKey = `pedro_local_comments_${animeId}`;
    const localStr = localStorage.getItem(localKey);
    const localComments: Comment[] = localStr ? JSON.parse(localStr) : [];

    // Combine and remove duplicate comment contents for same user if any
    const allComments = [...remoteComments];
    localComments.forEach(localC => {
      const exists = allComments.some(remoteC => 
        remoteC.user_id === localC.user_id && remoteC.content === localC.content
      );
      if (!exists) {
        allComments.push(localC);
      }
    });

    // Sort by date descending
    allComments.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return allComments;
  }

  async addComment(animeId: string, content: string, rating?: number): Promise<boolean> {
    const username = this.userProfile?.username || 'Usuario';
    const newComment: Comment = {
      anime_id: animeId,
      user_id: this.currentUser?.id || 'guest',
      username: username,
      content: content,
      rating: rating,
      created_at: new Date().toISOString()
    };

    let remoteSuccess = false;
    if (this.currentUser && !this._isGuest) {
      try {
        const insertData: any = {
          anime_id: animeId,
          user_id: this.currentUser.id,
          username: username,
          content: content
        };

        if (rating !== undefined && rating !== null) {
          insertData.rating = rating;
        }

        const { error } = await this.supabaseService.client
          .from('comments')
          .insert(insertData);

        if (!error) {
          remoteSuccess = true;
        } else {
          console.warn('Error saving comment to Supabase:', error);
          if (error.code === '42703' || error.message?.includes('rating')) {
            delete insertData.rating;
            const { error: retryError } = await this.supabaseService.client
              .from('comments')
              .insert(insertData);
            if (!retryError) {
              remoteSuccess = true;
            }
          }
        }
      } catch (e) {
        console.warn('Exception saving comment to Supabase:', e);
      }
    }

    // Always save locally as a reliable fallback/history, and if remote failed/user is guest
    const localKey = `pedro_local_comments_${animeId}`;
    const localStr = localStorage.getItem(localKey);
    const localComments: Comment[] = localStr ? JSON.parse(localStr) : [];
    localComments.unshift(newComment);
    localStorage.setItem(localKey, JSON.stringify(localComments));

    return true; // Return true because it succeeded locally
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
    const animeIdStr = String(animeId);
    if (this._isGuest) {
      const lists = await this.getUserLists();
      for (const key in lists) {
        const list = lists[key as keyof UserLists];
        const anime = list.find(a => String(a.id) === animeIdStr);
        if (anime) {
          anime.watched_episodes = episodes;
        }
      }
      localStorage.setItem(this.GUEST_LISTS_KEY, JSON.stringify(lists));
      return;
    }

    if (!this.currentUser) return;

    const targetUserId = this.currentUser.id;
    const animeIdForDb: any = isNaN(Number(animeIdStr)) ? animeIdStr : Number(animeIdStr);

    const { error } = await this.supabaseService.client
      .from('user_lists')
      .update({ watched_episodes: episodes })
      .match({ user_id: targetUserId, anime_id: animeIdForDb });

    if (error) {
      console.error('Error updating episodes:', error);
      const fallbackLists = this.getLocalLists(targetUserId);
      for (const key in fallbackLists) {
        const list = fallbackLists[key as keyof UserLists];
        const anime = list.find(a => String(a.id) === animeIdStr);
        if (anime) {
          anime.watched_episodes = episodes;
        }
      }
      this.saveLocalLists(fallbackLists, targetUserId);
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
