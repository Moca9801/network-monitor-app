import { afterEach, describe, expect, it } from 'vitest';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('uses build-time backend URL when runtime config is unavailable', async () => {
        globalThis.fetch = async () => {
            throw new Error('missing config');
        };

        const service = new AppConfigService();
        await service.load();

        expect(service.backendUrl).toBe('http://localhost:3000');
    });

    it('overrides backend URL from runtime config', async () => {
        globalThis.fetch = async () => new Response(JSON.stringify({
            backendUrl: 'https://api.example.test'
        }));

        const service = new AppConfigService();
        await service.load();

        expect(service.backendUrl).toBe('https://api.example.test');
    });
});
