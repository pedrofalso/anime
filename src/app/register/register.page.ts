import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class RegisterPage implements OnInit {
  username: string = '';
  password: string = '';
  error: string = '';
  successMsg: string = '';
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

  async register() {
    this.error = '';
    this.successMsg = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Por favor, introduce un nombre de usuario y una contraseña.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Supabase requiere que la contraseña tenga al menos 6 caracteres.';
      return;
    }

    const result = await this.authService.register(this.username.trim(), this.password.trim());
    if (result.success) {
      this.successMsg = '¡Cuenta creada con éxito! Redirigiendo al login...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    } else {
      this.error = result.message || 'Error al registrar. Inténtalo de nuevo.';
    }
  }
}
