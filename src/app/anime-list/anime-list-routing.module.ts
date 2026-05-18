import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnimeListPage } from './anime-list.page';

const routes: Routes = [
  {
    path: '',
    component: AnimeListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnimeListPageRoutingModule {}