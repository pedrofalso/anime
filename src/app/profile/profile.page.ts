import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService, User, UserLists } from '../services/auth';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  lists: UserLists = { watching: [], completed: [], onHold: [], dropped: [], planToWatch: [], favorites: [] };

  totalEntries: number = 0;
  totalEpisodes: number = 0;
  totalDays: number = 0;
  isPublicView: boolean = false;
  isSettingsOpen: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    public themeService: ThemeService
  ) { }

  ngOnInit() {
    this.loadProfile();
  }

  ionViewWillEnter() {
    this.loadProfile();
  }

  async loadProfile() {
    const usernameParam = this.route.snapshot.paramMap.get('username');
    this.isPublicView = !!usernameParam;
    
    if (usernameParam) {
      // Logic for public profile
      const publicUserData = await this.authService.getUserByUsername(usernameParam);
      if (publicUserData) {
        this.user = {
          username: publicUserData.username,
          joinDate: 'Miembro'
        };
        this.lists = await this.authService.getUserLists(publicUserData.user_id);
      }
    } else {
      // Normal private profile
      if (!this.authService.isLoggedIn()) {
        this.router.navigate(['/login']);
        return;
      }
      this.user = this.authService.getCurrentUser();
      this.lists = await this.authService.getUserLists();
    }
    this.calculateStats();
  }

  calculateStats() {
    let entries = 0;
    let eps = 0;

    const categories: (keyof UserLists)[] = ['watching', 'completed', 'onHold', 'dropped', 'planToWatch'];
    
    categories.forEach(cat => {
      this.lists[cat].forEach(anime => {
        entries++;
        eps += anime.watched_episodes || (cat === 'completed' ? anime.episodes : 0);
      });
    });

    this.totalEntries = entries;
    this.totalEpisodes = eps;
    // Rough estimation: 24 mins per episode / 60 / 24 = days
    this.totalDays = (eps * 24) / 1440;
  }

  getPercent(category: keyof UserLists): string {
    if (this.totalEntries === 0) return '0%';
    return ((this.lists[category].length / this.totalEntries) * 100) + '%';
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/anime-list']);
  }

  async changeAccentColor(color: string) {
    this.themeService.setAccentColor(color);
    if (!this.isPublicView) {
      await this.authService.updateProfile({ themeAccent: color });
    }
    this.showToast(`Tema ${color} activado`, 'primary');
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.user) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (this.user) this.user.avatarUrl = e.target.result;
    };
    reader.readAsDataURL(file);

    const path = `${this.user.username}_avatar_${Date.now()}.png`;
    const url = await this.authService.uploadImage(path, file);
    
    if (url) {
      await this.authService.updateProfile({ avatarUrl: url });
      this.user.avatarUrl = url;
      this.showToast('Avatar actualizado correctamente', 'success');
    } else {
      this.showToast('La imagen se ve localmente, pero hubo un error al subirla a la nube (Supabase).', 'warning');
    }
  }

  async onBannerSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.user) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (this.user) this.user.bannerUrl = e.target.result;
    };
    reader.readAsDataURL(file);

    const path = `${this.user.username}_banner_${Date.now()}.png`;
    const url = await this.authService.uploadImage(path, file);
    
    if (url) {
      await this.authService.updateProfile({ bannerUrl: url });
      this.user.bannerUrl = url;
      this.showToast('Banner actualizado correctamente', 'success');
    } else {
      this.showToast('La imagen se ve localmente, pero hubo un error al subirla a la nube (Supabase).', 'warning');
    }
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
