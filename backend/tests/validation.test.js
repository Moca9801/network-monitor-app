const test = require('node:test');
const assert = require('node:assert/strict');
const {
    credentialsSchema,
    isPrivateIP,
    isValidHost,
    parseSchema,
    targetSchema
} = require('../validation');

test('credentials schema accepts valid registration input', () => {
    const result = parseSchema(credentialsSchema, {
        username: 'admin',
        password: 'strong-password'
    });

    assert.equal(result.username, 'admin');
    assert.equal(result.password, 'strong-password');
});

test('credentials schema rejects short passwords', () => {
    const result = parseSchema(credentialsSchema, {
        username: 'admin',
        password: '123'
    });

    assert.equal(result, null);
});

test('target schema normalizes optional fields', () => {
    const result = parseSchema(targetSchema, {
        name: '  Google DNS  ',
        ip: '8.8.8.8'
    });

    assert.equal(result.name, 'Google DNS');
    assert.equal(result.category, 'Otros');
    assert.equal(result.type, 'Otros');
});

test('host validation rejects malformed hosts', () => {
    assert.equal(isValidHost('bad host name'), false);
    assert.equal(isValidHost('example.com'), true);
});

test('private IP detector covers common private ranges', () => {
    assert.equal(isPrivateIP('10.0.0.1'), true);
    assert.equal(isPrivateIP('172.16.0.1'), true);
    assert.equal(isPrivateIP('192.168.1.1'), true);
    assert.equal(isPrivateIP('8.8.8.8'), false);
});
