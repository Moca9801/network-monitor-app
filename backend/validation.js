const net = require('net');
const { z } = require('zod');
const { allowPrivateTargets } = require('./config');

const HOSTNAME_RE = /^[a-zA-Z0-9.-]+$/;
const RESERVED_HOSTNAMES = new Set(['localhost']);

function isNonEmptyString(value, maxLength = 120) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isPrivateIPv4(ip) {
    const parts = ip.split('.').map(part => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) return false;

    const [a, b] = parts;
    return a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254);
}

function isPrivateIPv6(ip) {
    const normalized = ip.toLowerCase();
    return normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80');
}

function isPrivateIP(ip) {
    const version = net.isIP(ip);
    if (version === 4) return isPrivateIPv4(ip);
    if (version === 6) return isPrivateIPv6(ip);
    return false;
}

function isValidHost(value) {
    const host = typeof value === 'string' ? value.trim() : '';
    if (host.length === 0 || host.length > 255) return false;
    if (RESERVED_HOSTNAMES.has(host.toLowerCase())) return allowPrivateTargets;

    const ipVersion = net.isIP(host);
    if (ipVersion !== 0) {
        return allowPrivateTargets || !isPrivateIP(host);
    }

    return HOSTNAME_RE.test(host);
}

const credentialsSchema = z.object({
    username: z.string().trim().min(1).max(50),
    password: z.string().min(8).max(200)
});

const loginSchema = z.object({
    username: z.string().trim().min(1).max(50),
    password: z.string().min(1).max(200)
});

const targetSchema = z.object({
    name: z.string().trim().min(1).max(120),
    ip: z.string().trim().refine(isValidHost, {
        message: 'Host inválido o no permitido'
    }),
    description: z.string().trim().max(500).optional().default(''),
    category: z.string().trim().min(1).max(50).optional().default('Otros'),
    type: z.string().trim().min(1).max(50).optional().default('Otros')
});

const editTargetSchema = targetSchema.extend({
    id: z.string().min(1).max(80)
});

const siteNameSchema = z.string().trim().min(1).max(50);
const targetIdSchema = z.string().trim().min(1).max(80);

const telegramSettingsSchema = z.object({
    telegramToken: z.string().trim().min(1).max(200),
    telegramChatId: z.string().trim().min(1).max(80)
});

const reorderSchema = z.array(z.string().min(1).max(80)).max(500);

const targetSettingsSchema = z.object({
    id: z.string().min(1).max(80),
    settings: z.object({
        audioAlert: z.boolean()
    })
});

function parseSchema(schema, input) {
    const result = schema.safeParse(input);
    if (!result.success) return null;
    return result.data;
}

module.exports = {
    credentialsSchema,
    editTargetSchema,
    isPrivateIP,
    isValidHost,
    isNonEmptyString,
    loginSchema,
    parseSchema,
    reorderSchema,
    siteNameSchema,
    targetSchema,
    targetIdSchema,
    targetSettingsSchema,
    telegramSettingsSchema
};
