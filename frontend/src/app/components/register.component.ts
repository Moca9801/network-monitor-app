import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="min-h-screen bg-main text-main px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1440px] items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <section class="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 lg:order-1">
          <div class="mb-8">
            <p class="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">Nuevo espacio</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-main">Crear cuenta</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-muted">
              Prepara tu dashboard privado para organizar sedes, equipos y alertas desde cero.
            </p>
          </div>

          <form class="space-y-5" (submit)="onSubmit()">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Usuario</label>
              <input name="username" type="text" required [(ngModel)]="username"
                class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-main outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Ej: admin">
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Contraseña</label>
              <input name="password" type="password" required [(ngModel)]="password"
                class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-main outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Mínimo 8 caracteres">
            </div>

            <div class="rounded-2xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
              <p class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Qué incluye</p>
              <ul class="mt-3 space-y-2 text-sm font-semibold text-muted">
                <li class="flex gap-2"><span class="text-emerald-300">•</span> Sedes personalizadas por usuario.</li>
                <li class="flex gap-2"><span class="text-emerald-300">•</span> Monitoreo ICMP en tiempo real.</li>
                <li class="flex gap-2"><span class="text-emerald-300">•</span> Alertas opcionales por Telegram.</li>
              </ul>
            </div>

            <div *ngIf="error" class="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
              {{ error }}
            </div>

            <button type="submit"
              class="btn-premium w-full rounded-2xl py-4 text-xs font-black uppercase tracking-[0.22em] transition-transform hover:scale-[1.01] active:scale-95">
              Crear mi dashboard
            </button>

            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p class="text-sm font-semibold text-muted">
                ¿Ya tienes cuenta?
                <a routerLink="/login" class="font-black text-blue-300 hover:text-blue-200">Inicia sesión</a>
              </p>
            </div>
          </form>
        </section>

        <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:order-2 lg:p-10">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(16,185,129,0.22),transparent_32%),radial-gradient(circle_at_95%_10%,rgba(59,130,246,0.18),transparent_30%)]"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:44px_44px] opacity-60"></div>

          <div class="relative z-10 space-y-8">
            <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span class="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.9)]"></span>
              <span class="text-[10px] font-black uppercase tracking-[0.28em] text-muted">Diseñado para self-hosting</span>
            </div>

            <div class="space-y-4">
              <h1 class="max-w-4xl text-5xl font-black italic leading-none tracking-[-0.08em] sm:text-6xl lg:text-7xl">
                <span class="bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  TU NOC PERSONAL
                </span>
              </h1>
              <p class="max-w-2xl text-base font-semibold leading-7 text-muted sm:text-lg">
                Crea una instancia privada, agrega tus sedes y empieza a observar el estado de tus equipos con una
                interfaz lista para demo y operación.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Organización</p>
                <p class="mt-2 text-3xl font-black text-main">Sedes</p>
                <p class="mt-2 text-sm font-semibold leading-6 text-muted">Crea ubicaciones propias por usuario.</p>
              </div>
              <div class="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Estado</p>
                <p class="mt-2 text-3xl font-black text-emerald-300">Live</p>
                <p class="mt-2 text-sm font-semibold leading-6 text-muted">Actualización por WebSockets.</p>
              </div>
            </div>

            <div class="rounded-[2rem] border border-white/10 bg-black/25 p-5">
              <div class="mb-4 flex items-center justify-between">
                <p class="text-sm font-black text-main">Setup recomendado</p>
                <span class="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
                  Open source
                </span>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-xs font-black text-emerald-300">1</span>
                  <p class="text-sm font-bold text-muted">Configura variables de entorno seguras.</p>
                </div>
                <div class="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-400/10 text-xs font-black text-blue-300">2</span>
                  <p class="text-sm font-bold text-muted">Agrega sedes y objetivos autorizados.</p>
                </div>
                <div class="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-400/10 text-xs font-black text-indigo-300">3</span>
                  <p class="text-sm font-bold text-muted">Activa alertas si necesitas notificaciones.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  `,
    styles: [`
    :host {
      display: block;
    }

    .bg-main {
      background-color: var(--bg-main);
    }

    .text-main {
      color: var(--text-main);
    }

    .text-muted {
      color: var(--text-muted);
    }
  `]
})
export class RegisterComponent {
    username = '';
    password = '';
    error = '';

    private authService = inject(AuthService);
    private router = inject(Router);

    onSubmit() {
        this.authService.register(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/login']),
            error: (err: any) => this.error = 'Error al registrar usuario'
        });
    }
}
