import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'anime-list',
    loadComponent: () => import('./anime-list/anime-list.page').then( m => m.AnimeListPage)
  },
  {
    path: 'anime/:id',
    loadComponent: () => import('./anime-detail/anime-detail.page').then( m => m.AnimeDetailPage)
  },
  {
    path: '',
    redirectTo: 'anime-list',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage)
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
