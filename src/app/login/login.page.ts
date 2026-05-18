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


  async ngOnInit() {
    await this.authService.ready;
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/profile']);
    }
  }

  async login() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Por favor, introduce un usuario y una contraseña.';
      return;
    }

    try {
      this.error = 'Iniciando sesión...'; 
      
      // Creamos un timeout para detectar si Supabase se queda bloqueado por el Navigator Lock
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Bloqueo interno del navegador detectado. Por favor, CIERRA ESTA PESTAÑA y vuelve a abrir localhost:8100 en una nueva.')), 5000)
      );

      const success = await Promise.race([
        this.authService.login(this.username.trim(), this.password.trim()),
        timeoutPromise
      ]);

      if (success) {
        this.error = '¡Éxito! Redirigiendo...';
        setTimeout(() => {
          this.router.navigate(['/anime-list']);
        }, 100);
      } else {
        this.error = 'Usuario o contraseña incorrectos.';
      }
    } catch (e: any) {
      this.error = 'Fallo crítico: ' + (e.message || String(e));
      console.error('Error in login page:', e);
    }
  }

  loginAsGuest() {
    this.authService.loginAsGuest();
    this.router.navigate(['/anime-list']);
  }
}
