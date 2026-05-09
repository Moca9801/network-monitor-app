const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { encryptionSecret, jwtSecret } = require('./config');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ENCRYPTED_PREFIX = 'enc:v1:';
const DEFAULT_SITES = ['Otros'];

function getEncryptionKey() {
    return crypto.createHash('sha256').update(encryptionSecret).digest();
}

function encryptSecret(value) {
    if (!value || typeof value !== 'string' || value.startsWith(ENCRYPTED_PREFIX)) {
        return value;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
    if (!value || typeof value !== 'string' || !value.startsWith(ENCRYPTED_PREFIX)) {
        return value;
    }

    try {
        const [, ivText, tagText, encryptedText] = value.split(':');
        const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivText, 'base64'));
        decipher.setAuthTag(Buffer.from(tagText, 'base64'));
        return Buffer.concat([
            decipher.update(Buffer.from(encryptedText, 'base64')),
            decipher.final()
        ]).toString('utf8');
    } catch (err) {
        console.error('No se pudo descifrar un secreto almacenado:', err.message);
        return '';
    }
}

function sanitizeUser(user) {
    return {
        ...user,
        telegramToken: decryptSecret(user.telegramToken),
        telegramChatId: decryptSecret(user.telegramChatId)
    };
}

function readStoredUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function getUsers() {
    return readStoredUsers().map(sanitizeUser);
}

function saveUsers(users) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2));
    fs.renameSync(tmpFile, USERS_FILE);
}

async function register(username, password) {
    const users = readStoredUsers();
    if (users.find(u => u.username === username)) {
        throw new Error('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        username,
        password: hashedPassword,
        sites: DEFAULT_SITES
    };

    users.push(newUser);
    saveUsers(users);
    return { id: newUser.id, username: newUser.username };
}

async function login(username, password) {
    const users = readStoredUsers();
    const user = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '24h' });
    return { user: { id: user.id, username: user.username }, token };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (err) {
        return null;
    }
}

function getUserById(userId) {
    const users = readStoredUsers();
    const user = users.find(u => u.id === userId);
    return user ? sanitizeUser(user) : undefined;
}

function getUserSites(userId) {
    const user = getUserById(userId);
    return Array.isArray(user?.sites) && user.sites.length > 0 ? user.sites : DEFAULT_SITES;
}

function updateUserSites(userId, sites) {
    return updateUserSettings(userId, { sites });
}

function updateUserSettings(userId, settings) {
    const users = readStoredUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        const nextSettings = { ...settings };
        if (Object.prototype.hasOwnProperty.call(nextSettings, 'telegramToken')) {
            nextSettings.telegramToken = encryptSecret(nextSettings.telegramToken);
        }
        if (Object.prototype.hasOwnProperty.call(nextSettings, 'telegramChatId')) {
            nextSettings.telegramChatId = encryptSecret(nextSettings.telegramChatId);
        }

        users[idx] = {
            ...users[idx],
            ...nextSettings
        };
        saveUsers(users);
        return true;
    }
    return false;
}

module.exports = {
    getUserById,
    getUserSites,
    register,
    login,
    updateUserSettings,
    updateUserSites,
    verifyToken
};
