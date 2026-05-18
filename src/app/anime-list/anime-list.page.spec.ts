/// <reference types="jasmine" />
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AnimeListPage } from './anime-list.page';

describe('AnimeListPage', () => {
  let component: AnimeListPage;
  let fixture: ComponentFixture<AnimeListPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AnimeListPage, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AnimeListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});