const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
    closeServer,
    connectSocketWithInitialState,
    listen,
    once,
    prepareTestEnv
} = require('./helpers/socket-test-utils');

prepareTestEnv('network-monitor-demo-socket-', {
    DEMO_MODE: 'true',
    DEMO_USERNAME: 'demo',
    DEMO_PASSWORD: 'demo-password',
    ALLOW_PRIVATE_TARGETS: 'false'
});

const { app, server } = require('../server');
const { ensureDemoUser } = require('../auth');
const { ensureDemoTargets, getTargets, stopMonitoring } = require('../monitor');

let baseUrl;

test.before(async () => {
    await ensureDemoUser();
    ensureDemoTargets('demo-user');
    baseUrl = await listen(server);
});

test.after(async () => {
    stopMonitoring();
    await closeServer(server);
});

test('demo endpoint exposes read-only demo credentials', async () => {
    const response = await request(app)
        .get('/api/demo')
        .expect(200);

    assert.equal(response.body.username, 'demo');
    assert.equal(response.body.password, 'demo-password');
    assert.equal(response.body.readOnly, true);
});

test('demo socket receives seeded targets and blocks writes', async (t) => {
    const loginResponse = await request(app)
        .post('/api/login')
        .send({ username: 'demo', password: 'demo-password' })
        .expect(200);

    const { socket, initialTargets } = await connectSocketWithInitialState(baseUrl, loginResponse.body.token);
    t.after(() => socket.disconnect());

    assert.equal(initialTargets.length, 3);

    const errorPromise = once(socket, 'target-error');
    socket.emit('add-target', {
        name: 'Blocked Target',
        ip: '8.8.4.4',
        description: 'Should not be persisted',
        category: 'Demo',
        type: 'Servidor'
    });

    const error = await errorPromise;
    assert.match(error.message, /demo es de solo lectura/i);

    const persistedTargets = getTargets('demo-user');
    assert.equal(persistedTargets.length, 3);
    assert.equal(persistedTargets.some(target => target.name === 'Blocked Target'), false);
});
