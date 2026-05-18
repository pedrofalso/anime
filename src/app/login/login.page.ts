import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';
  error: string = '';
  showPassword = false;

  constructor(private authService: AuthService, private router: Router) { }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }


  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/profile']);
    }
  }

  async login() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Por favor, introduce un usuario y una contraseña.';
      return;
    }

    const success = await this.authService.login(this.username.trim(), this.password.trim());
    if (success) {
      this.error = '';
      this.router.navigate(['/anime-list']);
    } else {
      this.error = 'Usuario o contraseña incorrectos.';
    }
  }

  loginAsGuest() {
    this.authService.loginAsGuest();
    this.router.navigate(['/anime-list']);
  }
}
