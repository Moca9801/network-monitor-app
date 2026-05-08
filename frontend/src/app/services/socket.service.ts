import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket!: Socket;
    private backendUrl = environment.backendUrl;
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
            if (!this.socket) {
                observer.complete();
                return undefined;
            }

            const handler = (data: any) => {
                observer.next(data);
            };
            this.socket.on('ping-result', handler);

            return () => this.socket?.off('ping-result', handler);
        });
    }

    onStatusChange(): Observable<any> {
        return this.listen('status-change');
    }

    onNotificationSettingsUpdated(): Observable<any> {
        return this.listen('notification-settings-updated');
    }

    onTestNotificationResult(): Observable<any> {
        return this.listen('test-notification-result');
    }

    addTarget(target: any) {
        if (!this.socket) return;
        this.socket.emit('add-target', target);
    }

    editTarget(target: any) {
        if (!this.socket) return;
        this.socket.emit('edit-target', target);
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

    updateNotificationSettings(settings: any) {
        if (!this.socket) return;
        this.socket.emit('update-notification-settings', settings);
    }

    testTelegramNotification(settings: any) {
        if (!this.socket) return;
        this.socket.emit('test-telegram-notification', settings);
    }

    private listen(eventName: string): Observable<any> {
        return new Observable(observer => {
            if (!this.socket) {
                observer.complete();
                return undefined;
            }

            const handler = (data: any) => {
                observer.next(data);
            };
            this.socket.on(eventName, handler);

            return () => this.socket?.off(eventName, handler);
        });
    }
}
