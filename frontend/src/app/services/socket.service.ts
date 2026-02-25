import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket!: Socket;
    private backendUrl = 'http://localhost:3000';
    private authService = inject(AuthService);

    private targetsSubject = new BehaviorSubject<any[]>([]);
    targets$ = this.targetsSubject.asObservable();

    constructor() {
        this.connect();
    }

    private connect() {
        const token = this.authService.getToken();
        if (!token) return;

        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(this.backendUrl, {
            auth: { token }
        });

        this.socket.on('initial-targets', (targets: any[]) => {
            this.targetsSubject.next(targets);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message === 'Token inválido' || err.message === 'Autenticación requerida') {
                this.authService.logout();
                window.location.href = '/login';
            }
        });
    }

    // Expose socket for custom listeners
    get socketInstance() {
        return this.socket;
    }

    // Call this after login to refresh connection with new token
    refreshConnection() {
        this.connect();
    }

    getPingResults(): Observable<any> {
        return new Observable(observer => {
            if (!this.socket) return;
            this.socket.on('ping-result', (data: any) => {
                observer.next(data);
            });
        });
    }

    addTarget(target: any) {
        if (!this.socket) return;
        this.socket.emit('add-target', target);
    }

    removeTarget(id: string) {
        if (!this.socket) return;
        this.socket.emit('remove-target', id);
    }

    reorderTargets(newOrder: string[]) {
        if (!this.socket) return;
        this.socket.emit('reorder-targets', newOrder);
    }

    addTargetSettings(id: string, settings: any) {
        if (!this.socket) return;
        this.socket.emit('update-target-settings', { id, settings });
    }
}
