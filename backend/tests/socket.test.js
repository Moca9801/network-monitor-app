const test = require('node:test');
const assert = require('node:assert/strict');
const {
    closeServer,
    connectSocketWithInitialState,
    createUserAndToken,
    listen,
    once,
    prepareTestEnv
} = require('./helpers/socket-test-utils');

prepareTestEnv('network-monitor-socket-');

const { app, server } = require('../server');
const { stopMonitoring } = require('../monitor');

let baseUrl;

test.before(async () => {
    baseUrl = await listen(server);
});

test.after(async () => {
    stopMonitoring();
    await closeServer(server);
});

test('authenticated socket can manage targets', async (t) => {
    const token = await createUserAndToken(app);
    const {
        socket,
        initialTargets,
        initialSites
    } = await connectSocketWithInitialState(baseUrl, token);
    t.after(() => socket.disconnect());

    assert.deepEqual(initialTargets, []);
    assert.ok(initialSites.includes('Otros'));

    const addedTargetsPromise = once(socket, 'initial-targets');
    socket.emit('add-target', {
        name: 'Public DNS',
        ip: '8.8.8.8',
        description: 'Integration test target',
        category: 'Lab',
        type: 'Servidor'
    });

    const addedTargets = await addedTargetsPromise;
    assert.equal(addedTargets.length, 1);
    assert.equal(addedTargets[0].name, 'Public DNS');
    assert.equal(addedTargets[0].category, 'Lab');
    assert.equal(addedTargets[0].audioAlert, true);

    const targetId = addedTargets[0].id;

    const settingsTargetsPromise = once(socket, 'initial-targets');
    socket.emit('update-target-settings', {
        id: targetId,
        settings: { audioAlert: false }
    });

    const settingsTargets = await settingsTargetsPromise;
    assert.equal(settingsTargets[0].audioAlert, false);

    const editedTargetsPromise = once(socket, 'initial-targets');
    socket.emit('edit-target', {
        ...settingsTargets[0],
        name: 'Edited DNS',
        ip: '1.1.1.1',
        description: 'Edited by integration test',
        category: 'Cloud',
        type: 'Servidor'
    });

    const editedTargets = await editedTargetsPromise;
    assert.equal(editedTargets[0].name, 'Edited DNS');
    assert.equal(editedTargets[0].ip, '1.1.1.1');
    assert.equal(editedTargets[0].category, 'Cloud');

    const removedTargetsPromise = once(socket, 'initial-targets');
    socket.emit('remove-target', targetId);

    const removedTargets = await removedTargetsPromise;
    assert.deepEqual(removedTargets, []);
});

test('socket rejects invalid target payloads', async (t) => {
    const token = await createUserAndToken(app, `invalid-${Date.now()}`);
    const { socket } = await connectSocketWithInitialState(baseUrl, token);
    t.after(() => socket.disconnect());

    const errorPromise = once(socket, 'target-error');
    socket.emit('add-target', {
        name: 'Bad Target',
        ip: 'not a valid host with spaces'
    });

    const error = await errorPromise;
    assert.equal(error.message, 'Datos del objetivo inválidos');
});
