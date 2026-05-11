import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { AppConfigService } from '../../services/app-config.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LatencyChartComponent } from '../latency-chart/latency-chart.component';
import {
    LogEntry,
    SiteStatusSummary,
    Target,
    TargetInput,
    TelegramSettings
} from '../../models/monitoring.models';

type DialogVariant = 'info' | 'danger' | 'success';

interface AppDialog {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: DialogVariant;
    onConfirm: (() => void) | null;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, LatencyChartComponent, DragDropModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    targets: Target[] = [];
    logs: LogEntry[] = [];
    currentTheme: 'dark' | 'light' | 'daltonic' = 'dark';
    chartPoints: number = 20;

    // Sedes y Tipos
    sedes = ['Otros'];
    tipos = ['Servidor', 'Switch', 'Access Point', 'Radio', 'Enlace', 'Otros'];
    newSiteName = '';
    siteErrorMessage = '';
    connectionStatus: 'idle' | 'connected' | 'disconnected' | 'error' = 'idle';
    isDemoMode = false;

    // Form model
    newServer: TargetInput = {
        name: '',
        ip: '',
        description: '',
        category: 'Otros',
        type: 'Servidor'
    };
    editingTarget: Target = this.createEmptyTarget();

    // Modal States
    isAddModalOpen = false;
    isEditModalOpen = false;
    isDetailsModalOpen = false;
    isSettingsModalOpen = false;
    showHeaderMenu = false;
    configTab: 'personal' | 'group' = 'personal';
    testStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
    testErrorMessage = '';
    selectedTarget: Target | null = null;
    appDialog: AppDialog = {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Aceptar',
        cancelText: '',
        variant: 'info',
        onConfirm: null
    };

    telegramSettings: TelegramSettings = {
        telegramToken: '',
        telegramChatId: ''
    };

    private subscriptions: Subscription = new Subscription();
    private socketService = inject(SocketService);
    private storageService = inject(StorageService);
    private authService = inject(AuthService);
    private appConfig = inject(AppConfigService);
    private router = inject(Router);

    constructor() { }

    private createEmptyTarget(): Target {
        return {
            ...this.newServer,
            id: '',
            alive: null,
            latency: 0,
            stats: { sq: 0, rp: 0, lp: 0, ppl: '0.0', min: '0', max: '0', avg: '0' }
        };
    }

    openAdd() {
        this.isAddModalOpen = true;
    }

    closeAdd() {
        this.isAddModalOpen = false;
        // Reset form if needed, though newServer is already there
    }

    openEdit(target: Target) {
        this.editingTarget = { ...target };
        this.isEditModalOpen = true;
    }

    closeEdit() {
        this.isEditModalOpen = false;
        this.editingTarget = this.createEmptyTarget();
    }

    saveEdit() {
        if (this.editingTarget) {
            this.socketService.editTarget(this.editingTarget);
            this.closeEdit();
        }
    }

    openDetails(target: Target) {
        this.selectedTarget = target;
        this.isDetailsModalOpen = true;
    }

    closeDetails() {
        this.isDetailsModalOpen = false;
        this.selectedTarget = null;
    }

    openSettings() {
        this.isSettingsModalOpen = true;
    }

    closeSettings() {
        this.isSettingsModalOpen = false;
    }

    saveSettings() {
        if (this.telegramSettings.telegramToken && this.telegramSettings.telegramChatId) {
            this.socketService.updateNotificationSettings(this.telegramSettings);
        }
    }

    testTelegramConnection() {
        if (this.telegramSettings.telegramToken && this.telegramSettings.telegramChatId) {
            this.testStatus = 'testing';
            this.testErrorMessage = '';
            this.socketService.testTelegramNotification(this.telegramSettings);
        }
    }

    setTab(tab: 'personal' | 'group') {
        this.configTab = tab;
    }

    addSite() {
        const siteName = this.newSiteName.trim();
        if (!siteName) return;
        this.socketService.addSite(siteName);
        this.newSiteName = '';
    }

    removeSite(siteName: string) {
        if (siteName === 'Otros') return;
        this.openDialog({
            title: 'Eliminar sede',
            message: `¿Eliminar la sede "${siteName}"? Solo se puede si no tiene equipos asignados.`,
            confirmText: 'Eliminar sede',
            cancelText: 'Cancelar',
            variant: 'danger',
            onConfirm: () => {
            this.socketService.removeSite(siteName);
            }
        });
    }

    getOnlineTargetsCount() {
        return this.targets.filter(target => target.alive === true).length;
    }

    getOfflineTargetsCount() {
        return this.targets.filter(target => target.alive === false).length;
    }

    getKnownTargetsCount() {
        return this.targets.filter(target => target.alive !== null && target.alive !== undefined).length;
    }

    hasPacketLoss(target: Target) {
        return Number(target.stats.ppl) > 0;
    }

    ngOnInit() {
        this.loadTheme();
        this.isDemoMode = this.appConfig.demoMode;
        this.socketService.refreshConnection();
        this.logs = this.storageService.getLogs();

        this.subscriptions.add(
            this.socketService.connectionStatus$.subscribe(status => {
                this.connectionStatus = status;
            })
        );

        this.subscriptions.add(
            this.socketService.targets$.subscribe(targets => {
                this.targets = targets.map(t => {
                    const existing = this.targets.find(old => old.id === t.id);
                    return {
                        ...t,
                        category: t.category || 'Otros',
                        alive: existing ? existing.alive : null,
                        latency: existing ? existing.latency : 0,
                        stats: t.stats || existing?.stats || { sq: 0, rp: 0, lp: 0, ppl: '0.0', min: '0', max: '0', avg: '0' }
                    };
                });
            })
        );

        this.subscriptions.add(
            this.socketService.sites$.subscribe(sites => {
                const targetSites = this.targets.map(target => target.category || 'Otros');
                this.sedes = [...new Set([...sites, ...targetSites, 'Otros'])];
                if (!this.sedes.includes(this.newServer.category)) {
                    this.newServer.category = this.sedes[0] || 'Otros';
                }
            })
        );

        this.subscriptions.add(
            this.socketService.getPingResults().subscribe(result => {
                const index = this.targets.findIndex(t => t.id === result.id);
                if (index !== -1) {
                    if (this.targets[index].alive !== null && this.targets[index].alive !== result.alive) {
                        const logEntry: LogEntry = {
                            name: result.name,
                            status: result.alive ? 'Online' : 'Offline',
                            timestamp: result.timestamp
                        };
                        this.storageService.saveLog(logEntry);
                        this.logs = this.storageService.getLogs();
                    }

                    this.targets[index] = { ...this.targets[index], ...result };
                    this.storageService.saveHistory(result.ip, {
                        latency: result.latency,
                        timestamp: result.timestamp
                    });
                }
            })
        );

        this.subscriptions.add(
            this.socketService.onStatusChange().subscribe(data => {
                const target = this.targets.find(t => t.id === data.id);
                if (target && target.audioAlert) {
                    this.playAlertSound(data.status);
                }
            })
        );

        this.subscriptions.add(
            this.socketService.onNotificationSettingsUpdated().subscribe(response => {
                if (response.success) {
                    this.openDialog({
                        title: 'Alertas guardadas',
                        message: 'La configuración de Telegram se guardó correctamente.',
                        confirmText: 'Entendido',
                        variant: 'success'
                    });
                    this.closeSettings();
                    this.testStatus = 'idle';
                } else {
                    this.testStatus = 'error';
                    this.testErrorMessage = response.error || 'No se pudo guardar la configuración.';
                }
            })
        );

        this.subscriptions.add(
            this.socketService.onTestNotificationResult().subscribe(response => {
                if (response.success) {
                    this.testStatus = 'success';
                } else {
                    this.testStatus = 'error';
                    this.testErrorMessage = response.error || 'No se pudo enviar la prueba.';
                }
            })
        );

        this.subscriptions.add(
            this.socketService.onSitesUpdated().subscribe(response => {
                if (response.success) {
                    this.siteErrorMessage = '';
                } else {
                    this.siteErrorMessage = response.error || 'No se pudo actualizar la sede.';
                }
            })
        );

        this.subscriptions.add(
            this.socketService.onTargetError().subscribe(error => {
                this.openDialog({
                    title: 'Acción no disponible',
                    message: error.message,
                    confirmText: 'Entendido',
                    variant: 'info'
                });
            })
        );
    }

    loadTheme() {
        const saved = localStorage.getItem('theme') as any;
        if (saved) {
            this.setTheme(saved);
        } else {
            this.setTheme('dark');
        }
    }

    setTheme(theme: 'dark' | 'light' | 'daltonic') {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    playAlertSound(status: 'down' | 'recovered') {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(status === 'down' ? 150 : 800, context.currentTime);

            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start();
            oscillator.stop(context.currentTime + 0.5);
        } catch (e) {
            console.error('Web Audio API not supported or interaction required:', e);
        }
    }

    toggleAudio(target: Target) {
        const newState = !target.audioAlert;
        this.socketService.addTargetSettings(target.id, { audioAlert: newState });
    }

    addServer() {
        if (this.newServer.name && this.newServer.ip) {
            this.socketService.addTarget(this.newServer);
            this.newServer = { name: '', ip: '', description: '', category: 'Otros', type: 'Servidor' };
        }
    }

    removeServer(id: string) {
        this.openDialog({
            title: 'Eliminar monitorización',
            message: '¿Estás seguro de que deseas dejar de monitorear este servidor?',
            confirmText: 'Eliminar equipo',
            cancelText: 'Cancelar',
            variant: 'danger',
            onConfirm: () => {
            this.socketService.removeTarget(id);
            }
        });
    }

    onDrop(event: CdkDragDrop<Target[]>) {
        moveItemInArray(this.targets, event.previousIndex, event.currentIndex);
        const newOrder = this.targets.map(t => t.id);
        this.socketService.reorderTargets(newOrder);
    }

    getTargetsByCategory(category: string): Target[] {
        return this.targets.filter(t => t.category === category);
    }

    canRemoveSite(siteName: string) {
        return siteName !== 'Otros' && this.getTargetsByCategory(siteName).length === 0;
    }

    getSiteStatusSummary(siteName: string): SiteStatusSummary {
        const targets = this.getTargetsByCategory(siteName);
        const online = targets.filter(target => target.alive === true).length;
        const offline = targets.filter(target => target.alive === false).length;
        return { total: targets.length, online, offline };
    }

    getTargetsByCategoryAndType(category: string, type: string) {
        return this.targets.filter(t => t.category === category && (t.type || 'Otros') === type);
    }

    getTypesInCategory(category: string): string[] {
        const targets = this.getTargetsByCategory(category);
        const types = [...new Set(targets.map(t => t.type || 'Otros'))];
        return this.tipos.filter(t => types.includes(t));
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    openDialog(config: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: DialogVariant;
        onConfirm?: () => void;
    }) {
        this.appDialog = {
            isOpen: true,
            title: config.title,
            message: config.message,
            confirmText: config.confirmText || 'Aceptar',
            cancelText: config.cancelText || '',
            variant: config.variant || 'info',
            onConfirm: config.onConfirm || null
        };
    }

    closeDialog() {
        this.appDialog.isOpen = false;
        this.appDialog.onConfirm = null;
    }

    confirmDialog() {
        const action = this.appDialog.onConfirm;
        this.closeDialog();
        action?.();
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
