import { beforeEach, describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(() => {
        localStorage.clear();
        service = new StorageService();
    });

    it('keeps latest logs first and limits stored logs', () => {
        for (let i = 0; i < 105; i++) {
            service.saveLog({
                name: `target-${i}`,
                status: i % 2 === 0 ? 'Online' : 'Offline',
                timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`
            });
        }

        const logs = service.getLogs();
        expect(logs.length).toBe(100);
        expect(logs[0].name).toBe('target-104');
    });

    it('keeps the latest 60 history entries per ip', () => {
        for (let i = 0; i < 65; i++) {
            service.saveHistory('8.8.8.8', {
                latency: i,
                timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`
            });
        }

        const history = service.getHistory()['8.8.8.8'];
        expect(history.length).toBe(60);
        expect(history[0].latency).toBe(5);
        expect(history[59].latency).toBe(64);
    });
});
