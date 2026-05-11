import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { AppConfigService } from './app-config.service';
import {
    OperationResponse,
    PingResult,
    StatusChange,
    Target,
    TargetError,
    TargetInput,
    TelegramSettings
} from '../models/monitoring.models';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket!: Socket;
    private authService = inject(AuthService);
    private appConfig = inject(AppConfigService);

    private targetsSubject = new BehaviorSubject<Target[]>([]);
    targets$ = this.targetsSubject.asObservable();
    private sitesSubject = new BehaviorSubject<string[]>(['Otros']);
    sites$ = this.sitesSubject.asObservable();
    private connectionStatusSubject = new BehaviorSubject<'idle' | 'connected' | 'disconnected' | 'error'>('idle');
    connectionStatus$ = this.connectionStatusSubject.asObservable();

    constructor() {
        this.connect();
    }

    private connect() {
        const token = this.authService.getToken();
        if (!token) return;

        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(this.appConfig.backendUrl, {
            auth: { token }
        });

        this.socket.on('connect', () => {
            this.connectionStatusSubject.next('connected');
        });

        this.socket.on('disconnect', () => {
            this.connectionStatusSubject.next('disconnected');
        });

        this.socket.on('initial-targets', (targets: Target[]) => {
            this.targetsSubject.next(targets);
        });

        this.socket.on('user-sites', (sites: string[]) => {
            this.sitesSubject.next(sites);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            this.connectionStatusSubject.next('error');
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

    getPingResults(): Observable<PingResult> {
        return new Observable(observer => {
            if (!this.socket) {
                observer.complete();
                return undefined;
            }

            const handler = (data: PingResult) => {
                observer.next(data);
            };
            this.socket.on('ping-result', handler);

            return () => this.socket?.off('ping-result', handler);
        });
    }

    onStatusChange(): Observable<StatusChange> {
        return this.listen<StatusChange>('status-change');
    }

    onNotificationSettingsUpdated(): Observable<OperationResponse> {
        return this.listen<OperationResponse>('notification-settings-updated');
    }

    onTestNotificationResult(): Observable<OperationResponse> {
        return this.listen<OperationResponse>('test-notification-result');
    }

    onSitesUpdated(): Observable<OperationResponse> {
        return this.listen<OperationResponse>('sites-updated');
    }

    onTargetError(): Observable<TargetError> {
        return this.listen<TargetError>('target-error');
    }

    addTarget(target: TargetInput) {
        if (!this.socket) return;
        this.socket.emit('add-target', target);
    }

    editTarget(target: Target) {
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

    addTargetSettings(id: string, settings: Pick<Target, 'audioAlert'>) {
        if (!this.socket) return;
        this.socket.emit('update-target-settings', { id, settings });
    }

    addSite(siteName: string) {
        if (!this.socket) return;
        this.socket.emit('add-site', siteName);
    }

    removeSite(siteName: string) {
        if (!this.socket) return;
        this.socket.emit('remove-site', siteName);
    }

    updateNotificationSettings(settings: TelegramSettings) {
        if (!this.socket) return;
        this.socket.emit('update-notification-settings', settings);
    }

    testTelegramNotification(settings: TelegramSettings) {
        if (!this.socket) return;
        this.socket.emit('test-telegram-notification', settings);
    }

    private listen<T>(eventName: string): Observable<T> {
        return new Observable(observer => {
            if (!this.socket) {
                observer.complete();
                return undefined;
            }

            const handler = (data: T) => {
                observer.next(data);
            };
            this.socket.on(eventName, handler);

            return () => this.socket?.off(eventName, handler);
        });
    }
}
