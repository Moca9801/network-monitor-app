import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthResponse, User } from '../models/monitoring.models';
import { AppConfigService } from './app-config.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    currentUser = signal<User | null>(this.getUserFromStorage());

    constructor(
        private http: HttpClient,
        private appConfig: AppConfigService
    ) { }

    private get apiUrl() {
        return `${this.appConfig.backendUrl}/api`;
    }

    register(username: string, password: string) {
        return this.http.post<User>(`${this.apiUrl}/register`, { username, password });
    }

    login(username: string, password: string) {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
            tap(res => {
                localStorage.setItem('token', res.token);
                localStorage.setItem('user', JSON.stringify(res.user));
                this.currentUser.set(res.user);
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser.set(null);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    isLoggedIn() {
        return !!this.getToken();
    }

    private getUserFromStorage(): User | null {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
}
