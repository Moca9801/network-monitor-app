import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { AppConfigService } from '../services/app-config.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main class="min-h-screen bg-main text-main px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1440px] items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.24),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(16,185,129,0.15),transparent_30%)]"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:44px_44px] opacity-60"></div>

          <div class="relative z-10 space-y-8">
            <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]"></span>
              <span class="text-[10px] font-black uppercase tracking-[0.28em] text-muted">Self-hosted network monitor</span>
            </div>

            <div class="space-y-4">
              <h1 class="max-w-4xl text-5xl font-black italic leading-none tracking-[-0.08em] sm:text-6xl lg:text-7xl">
                <span class="inline-block pr-3 pb-1 bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                  NETWORK MONITOR
                </span>
              </h1>
              <p class="max-w-2xl text-base font-semibold leading-7 text-muted sm:text-lg">
                Monitorea sedes, equipos, latencia y alertas críticas desde una experiencia visual pensada para
                operaciones en tiempo real.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Tiempo real</p>
                <p class="mt-2 text-2xl font-black text-blue-300">Socket.io</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Alertas</p>
                <p class="mt-2 text-2xl font-black text-emerald-300">Telegram</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Deploy</p>
                <p class="mt-2 text-2xl font-black text-main">Docker</p>
              </div>
            </div>

            <div class="rounded-[2rem] border border-white/10 bg-black/25 p-4 shadow-2xl">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Vista operativa</p>
                  <p class="text-sm font-black text-main">Demo de estado</p>
                </div>
                <span class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Online
                </span>
              </div>
              <div class="grid gap-3">
                <div class="flex items-center justify-between rounded-2xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
                  <div>
                    <p class="font-black text-main">Core Router</p>
                    <p class="font-mono text-[10px] uppercase tracking-widest text-muted">8.8.8.8</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xl font-black text-main">12<span class="text-xs text-muted">ms</span></p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-blue-300">RTT</p>
                  </div>
                </div>
                <div class="flex items-center justify-between rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
                  <div>
                    <p class="font-black text-main">Backup Link</p>
                    <p class="font-mono text-[10px] uppercase tracking-widest text-muted">1.1.1.1</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xl font-black text-red-300">2.5<span class="text-xs text-muted">%</span></p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-muted">PPL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          <div class="mb-8">
            <p class="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Bienvenido de vuelta</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-main">Iniciar sesión</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-muted">
              Accede a tu dashboard privado para seguir monitoreando tus equipos.
            </p>
          </div>

          <form class="space-y-5" (submit)="onSubmit()">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Usuario</label>
              <input name="username" type="text" required [(ngModel)]="username"
                class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-main outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Tu usuario">
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Contraseña</label>
              <input name="password" type="password" required [(ngModel)]="password"
                class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-main outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Tu contraseña">
            </div>

            <div *ngIf="error" class="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
              {{ error }}
            </div>

            <button type="submit"
              class="btn-premium w-full rounded-2xl py-4 text-xs font-black uppercase tracking-[0.22em] transition-transform hover:scale-[1.01] active:scale-95">
              Entrar al dashboard
            </button>

            <button *ngIf="isDemoMode" type="button" (click)="loginDemo()"
              class="w-full rounded-2xl border border-amber-300/30 bg-amber-300/10 py-4 text-xs font-black uppercase tracking-[0.22em] text-amber-100 transition hover:bg-amber-300/15">
              Entrar en modo demo
            </button>

            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p class="text-sm font-semibold text-muted">
                ¿No tienes cuenta?
                <a routerLink="/register" class="font-black text-blue-300 hover:text-blue-200">Crea tu acceso</a>
              </p>
            </div>
          </form>
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
export class LoginComponent {
    username = '';
    password = '';
    error = '';
    isDemoMode = false;

    private authService = inject(AuthService);
    private appConfig = inject(AppConfigService);
    private http = inject(HttpClient);
    private router = inject(Router);

    constructor() {
        this.isDemoMode = this.appConfig.demoMode;
    }

    onSubmit() {
        this.authService.login(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => this.error = 'Usuario o contraseña incorrectos'
        });
    }

    loginDemo() {
        this.http.get<{ username: string; password: string }>(`${this.appConfig.backendUrl}/api/demo`).subscribe({
            next: demo => {
                this.username = demo.username;
                this.password = demo.password;
                this.onSubmit();
            },
            error: () => this.error = 'La demo no está disponible en este momento.'
        });
    }
}
