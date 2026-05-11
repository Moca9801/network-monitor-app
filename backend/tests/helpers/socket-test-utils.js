const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { io: createClient } = require('socket.io-client');

function prepareTestEnv(prefix, overrides = {}) {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    process.env.JWT_SECRET = `${prefix}-jwt-secret`;
    process.env.SECRETS_ENCRYPTION_KEY = `${prefix}-encryption-secret`;
    process.env.CORS_ORIGIN = 'http://localhost:4200';
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    process.env.MAX_TARGETS_PER_USER = '20';
    process.env.DEMO_MODE = 'false';

    Object.assign(process.env, overrides);
}

function once(socket, eventName, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeoutMs);

        const handler = (payload) => {
            cleanup();
            resolve(payload);
        };

        const cleanup = () => {
            clearTimeout(timer);
            socket.off(eventName, handler);
        };

        socket.on(eventName, handler);
    });
}

function listen(server) {
    return new Promise((resolve) => {
        server.listen(0, () => {
            const address = server.address();
            resolve(`http://127.0.0.1:${address.port}`);
        });
    });
}

async function closeServer(server) {
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function createUserAndToken(app, username = `user-${Date.now()}`) {
    const password = 'strong-password';
    await request(app)
        .post('/api/register')
        .send({ username, password })
        .expect(201);

    const response = await request(app)
        .post('/api/login')
        .send({ username, password })
        .expect(200);

    return response.body.token;
}

async function connectSocket(baseUrl, token) {
    const socket = createClient(baseUrl, {
        auth: { token },
        reconnection: false,
        transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });

    return socket;
}

async function connectSocketWithInitialState(baseUrl, token) {
    const socket = createClient(baseUrl, {
        auth: { token },
        reconnection: false,
        transports: ['websocket']
    });

    const initialTargets = once(socket, 'initial-targets');
    const initialSites = once(socket, 'user-sites');

    await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });

    return {
        socket,
        initialTargets: await initialTargets,
        initialSites: await initialSites
    };
}

module.exports = {
    closeServer,
    connectSocket,
    connectSocketWithInitialState,
    createUserAndToken,
    listen,
    once,
    prepareTestEnv
};
