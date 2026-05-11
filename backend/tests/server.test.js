const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'network-monitor-test-'));
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SECRETS_ENCRYPTION_KEY = 'test-encryption-secret';
process.env.CORS_ORIGIN = 'http://localhost:4200';

const { app } = require('../server');

test('GET /health returns operational metrics', async () => {
    const response = await request(app)
        .get('/health')
        .expect(200);

    assert.equal(response.body.status, 'ok');
    assert.equal(typeof response.body.uptimeSeconds, 'number');
    assert.equal(typeof response.body.activeUsers, 'number');
    assert.equal(typeof response.body.totalTargets, 'number');
});

test('auth flow registers and logs in a user', async () => {
    const username = `user-${Date.now()}`;
    const password = 'strong-password';

    const registerResponse = await request(app)
        .post('/api/register')
        .send({ username, password })
        .expect(201);

    assert.equal(registerResponse.body.username, username);
    assert.ok(registerResponse.body.id);

    const loginResponse = await request(app)
        .post('/api/login')
        .send({ username, password })
        .expect(200);

    assert.equal(loginResponse.body.user.username, username);
    assert.ok(loginResponse.body.token);
});

test('auth validation rejects weak registration payloads', async () => {
    await request(app)
        .post('/api/register')
        .send({ username: 'bad', password: '123' })
        .expect(400);
});
