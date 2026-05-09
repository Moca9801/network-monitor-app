const DEFAULT_DEV_ORIGIN = 'http://localhost:4200';
const DEV_JWT_SECRET = 'dev-only-change-me';

function parseBoolean(value, fallback = false) {
    if (value === undefined) return fallback;
    return value === 'true';
}

function parseInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function requireInProduction(name, value) {
    if (process.env.NODE_ENV === 'production' && !value) {
        throw new Error(`${name} debe estar configurado en producción`);
    }
}

function parseOrigins(value) {
    return (value || DEFAULT_DEV_ORIGIN)
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
}

const jwtSecret = process.env.JWT_SECRET || DEV_JWT_SECRET;
requireInProduction('JWT_SECRET', process.env.JWT_SECRET);

const encryptionSecret = process.env.SECRETS_ENCRYPTION_KEY || jwtSecret;
requireInProduction('SECRETS_ENCRYPTION_KEY o JWT_SECRET', encryptionSecret);

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);
const allowPrivateTargets = parseBoolean(process.env.ALLOW_PRIVATE_TARGETS, process.env.NODE_ENV !== 'production');
const maxTargetsPerUser = parseInteger(process.env.MAX_TARGETS_PER_USER, 100);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS'));
    }
};

const socketCorsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
};

module.exports = {
    allowedOrigins,
    allowPrivateTargets,
    corsOptions,
    encryptionSecret,
    jwtSecret,
    maxTargetsPerUser,
    socketCorsOptions
};
