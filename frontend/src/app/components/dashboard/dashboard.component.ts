import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { StorageService } from '../../services/storage.service';
import { Subscription } from 'rxjs';
import { LatencyChartComponent } from '../latency-chart/latency-chart.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, LatencyChartComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    targets: any[] = [];
    logs: any[] = [];

    // Form model
    newServer = {
        name: '',
        ip: '',
        description: ''
    };

    private subscriptions: Subscription = new Subscription();

    constructor(
        private socketService: SocketService,
        private storageService: StorageService
    ) { }

    ngOnInit() {
        this.logs = this.storageService.getLogs();

        this.subscriptions.add(
            this.socketService.targets$.subscribe(targets => {
                // Preserve previous status if possible to avoid flickering online/offline
                this.targets = targets.map(t => {
                    const existing = this.targets.find(old => old.id === t.id);
                    return { ...t, alive: existing ? existing.alive : null, latency: existing ? existing.latency : 0 };
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
    }

    addServer() {
        if (this.newServer.name && this.newServer.ip) {
            this.socketService.addTarget(this.newServer);
            this.newServer = { name: '', ip: '', description: '' };
        }
    }

    removeServer(id: string) {
        if (confirm('¿Estás seguro de que deseas dejar de monitorear este servidor?')) {
            this.socketService.removeTarget(id);
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
}
