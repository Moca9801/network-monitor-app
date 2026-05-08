const DEFAULT_DEV_ORIGIN = 'http://localhost:4200';
const DEV_JWT_SECRET = 'dev-only-change-me';

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
    corsOptions,
    encryptionSecret,
    jwtSecret,
    socketCorsOptions
};
