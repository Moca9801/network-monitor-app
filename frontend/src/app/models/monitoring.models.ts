export interface User {
    id: string;
    username: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface TargetStats {
    sq: number;
    rp: number;
    lp: number;
    ppl: string;
    min: string;
    max: string;
    avg: string;
}

export interface TargetInput {
    name: string;
    ip: string;
    description: string;
    category: string;
    type: string;
}

export interface Target extends TargetInput {
    id: string;
    userId?: string;
    audioAlert?: boolean;
    order?: number;
    alive: boolean | null;
    latency: number;
    timestamp?: string;
    stats: TargetStats;
}

export interface PingResult extends Target {
    alive: boolean;
    timestamp: string;
}

export interface HistoryEntry {
    latency: number;
    timestamp: string;
}

export interface LogEntry {
    name: string;
    status: 'Online' | 'Offline';
    timestamp: string;
}

export interface TelegramSettings {
    telegramToken: string;
    telegramChatId: string;
}

export interface OperationResponse {
    success: boolean;
    error?: string;
}

export interface StatusChange {
    id: string;
    name: string;
    status: 'down' | 'recovered';
}

export interface SiteStatusSummary {
    total: number;
    online: number;
    offline: number;
}
