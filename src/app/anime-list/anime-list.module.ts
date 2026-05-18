import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AnimeListPageRoutingModule } from './anime-list-routing.module';
import { AnimeListPage } from './anime-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnimeListPageRoutingModule,
    AnimeListPage
  ],
  declarations: []
})
export class AnimeListPageModule {}