import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div class="max-w-md w-full space-y-8 p-10 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-white">Iniciar Sesión</h2>
          <p class="mt-2 text-center text-sm text-gray-400">
            Monitoriza tus servidores de forma privada
          </p>
        </div>
        <form class="mt-8 space-y-6" (submit)="onSubmit()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <input name="username" type="text" required [(ngModel)]="username"
                class="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Usuario">
            </div>
            <div>
              <input name="password" type="password" required [(ngModel)]="password"
                class="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña">
            </div>
          </div>

          <div *ngIf="error" class="text-red-500 text-sm text-center">
            {{ error }}
          </div>

          <div>
            <button type="submit"
              class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors uppercase tracking-wider">
              Entrar
            </button>
          </div>
          
          <div class="text-center mt-4">
            <a routerLink="/register" class="text-indigo-400 hover:text-indigo-300 text-sm">¿No tienes cuenta? Regístrate</a>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
    username = '';
    password = '';
    error = '';

    private authService = inject(AuthService);
    private router = inject(Router);

    onSubmit() {
        this.authService.login(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err: any) => this.error = 'Usuario o contraseña incorrectos'
        });
    }
}
