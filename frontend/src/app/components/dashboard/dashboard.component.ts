import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { LatencyChartComponent } from '../latency-chart/latency-chart.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, LatencyChartComponent, DragDropModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    targets: any[] = [];
    logs: any[] = [];
    currentTheme: 'dark' | 'light' | 'daltonic' = 'dark';

    // Categorías y Tipos
    sedes = ['CDJ', 'CJJ', 'CL', 'PUENTE GRANDE', 'Otros'];
    tipos = ['Servidor', 'Switch', 'Access Point', 'Radio', 'Enlace', 'Otros'];

    // Form model
    newServer = {
        name: '',
        ip: '',
        description: '',
        category: 'Otros',
        type: 'Servidor'
    };

    // Modal States
    isAddModalOpen = false;
    isEditModalOpen = false;
    isDetailsModalOpen = false;
    editingTarget: any = null;
    selectedTarget: any = null;

    private subscriptions: Subscription = new Subscription();
    private socketService = inject(SocketService);
    private storageService = inject(StorageService);
    private authService = inject(AuthService);
    private router = inject(Router);

    constructor() { }

    openAdd() {
        this.isAddModalOpen = true;
    }

    closeAdd() {
        this.isAddModalOpen = false;
        // Reset form if needed, though newServer is already there
    }

    openEdit(target: any) {
        this.editingTarget = { ...target };
        this.isEditModalOpen = true;
    }

    closeEdit() {
        this.isEditModalOpen = false;
        this.editingTarget = null;
    }

    saveEdit() {
        if (this.editingTarget) {
            this.socketService.socketInstance.emit('edit-target', this.editingTarget);
            this.closeEdit();
        }
    }

    openDetails(target: any) {
        this.selectedTarget = target;
        this.isDetailsModalOpen = true;
    }

    closeDetails() {
        this.isDetailsModalOpen = false;
        this.selectedTarget = null;
    }

    ngOnInit() {
        this.loadTheme();
        this.socketService.refreshConnection();
        this.logs = this.storageService.getLogs();

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
            this.socketService.getPingResults().subscribe(result => {
                const index = this.targets.findIndex(t => t.id === result.id);
                if (index !== -1) {
                    if (this.targets[index].alive !== null && this.targets[index].alive !== result.alive) {
                        const logEntry = {
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

        // Listen for status changes to play sound
        (this.socketService as any).socket?.on('status-change', (data: any) => {
            const target = this.targets.find(t => t.id === data.id);
            if (target && target.audioAlert) {
                this.playAlertSound(data.status);
            }
        });
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

    toggleAudio(target: any) {
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
        if (confirm('¿Estás seguro de que deseas dejar de monitorear este servidor?')) {
            this.socketService.removeTarget(id);
        }
    }

    onDrop(event: CdkDragDrop<any[]>) {
        moveItemInArray(this.targets, event.previousIndex, event.currentIndex);
        const newOrder = this.targets.map(t => t.id);
        this.socketService.reorderTargets(newOrder);
    }

    getTargetsByCategory(category: string) {
        return this.targets.filter(t => t.category === category);
    }

    getTargetsByCategoryAndType(category: string, type: string) {
        return this.targets.filter(t => t.category === category && (t.type || 'Otros') === type);
    }

    getTypesInCategory(category: string) {
        const targets = this.getTargetsByCategory(category);
        const types = [...new Set(targets.map(t => t.type || 'Otros'))];
        return this.tipos.filter(t => types.includes(t));
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
