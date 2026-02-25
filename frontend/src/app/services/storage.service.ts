import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly LOGS_KEY = 'uptime_logs';
    private readonly HISTORY_KEY = 'uptime_history';

    constructor() { }

    saveLog(log: any) {
        const logs = this.getLogs();
        logs.unshift(log);
        // Keep last 100 logs
        localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    }

    getLogs(): any[] {
        const data = localStorage.getItem(this.LOGS_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveHistory(ip: string, entry: any) {
        const history = this.getHistory();
        if (!history[ip]) {
            history[ip] = [];
        }
        history[ip].push(entry);
        // Keep last 60 entries (last hour of pings)
        history[ip] = history[ip].slice(-60);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }

    getHistory(): { [key: string]: any[] } {
        const data = localStorage.getItem(this.HISTORY_KEY);
        return data ? JSON.parse(data) : {};
    }
}
