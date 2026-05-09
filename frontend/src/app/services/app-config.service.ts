import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

interface RuntimeConfig {
    backendUrl?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    private config: Required<RuntimeConfig> = {
        backendUrl: environment.backendUrl
    };

    async load() {
        try {
            const response = await fetch('/app-config.json', { cache: 'no-store' });
            if (!response.ok) return;

            const runtimeConfig = await response.json() as RuntimeConfig;
            this.config = {
                ...this.config,
                ...runtimeConfig
            };
        } catch {
            // Keep build-time defaults when runtime config is not present.
        }
    }

    get backendUrl() {
        return this.config.backendUrl;
    }
}
