const ping = require('ping');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGETS_FILE = path.join(__dirname, 'targets.json');

function getTargets() {
    try {
        const data = fs.readFileSync(TARGETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function saveTargets(targets) {
    fs.writeFileSync(TARGETS_FILE, JSON.stringify(targets, null, 2));
}

async function pingIP(ip) {
    try {
        const res = await ping.promise.probe(ip, { timeout: 10 });
        return {
            alive: res.alive,
            time: res.time === 'unknown' ? 0 : parseFloat(res.time)
        };
    } catch (err) {
        return { alive: false, time: 0 };
    }
}

async function sendNotification(message) {
    console.log(`[ALERTA]: ${message}`);

    const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
    if (!webhookUrl) return;

    const data = JSON.stringify({ text: message });
    const url = new URL(webhookUrl);

    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        res.on('data', () => { });
    });

    req.on('error', (e) => {
        console.error(`Error en notificación: ${e.message}`);
    });

    req.write(data);
    req.end();
}

let monitorInterval = null;
const previousStatus = {};

function startMonitoring(io) {
    const runPings = async () => {
        const targets = getTargets();
        console.log(`Ejecutando pings para ${targets.length} servidores...`);

        for (const target of targets) {
            const result = await pingIP(target.ip);
            const timestamp = new Date().toISOString();

            const payload = {
                ...target,
                alive: result.alive,
                latency: result.time,
                timestamp
            };

            console.log(`Ping para ${target.name} (${target.ip}): ${result.alive ? 'EXITOSO (' + result.time + 'ms)' : 'FALLIDO'}`);
            io.emit('ping-result', payload);

            if (previousStatus[target.id] !== undefined && previousStatus[target.id] !== result.alive) {
                const statusStr = result.alive ? '✅ RECUPERADO' : '❌ CAÍDO';
                sendNotification(`Servicio: ${target.name}\nIP: ${target.ip}\nEstado: ${statusStr}\nFecha: ${timestamp}`);
            }
            previousStatus[target.id] = result.alive;
        }
    };

    if (monitorInterval) clearInterval(monitorInterval);
    runPings();
    monitorInterval = setInterval(runPings, 60000);
}

module.exports = { startMonitoring, getTargets, saveTargets };
