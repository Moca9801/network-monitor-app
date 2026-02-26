const ping = require('ping');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGETS_FILE = path.join(__dirname, 'targets.json');

// Memory state for stats
const statsState = {};
let activeUserIds = new Set();

function setActiveUsers(users) {
    activeUserIds = users;
}

function getTargets(userId = null) {
    try {
        if (!fs.existsSync(TARGETS_FILE)) return [];
        const data = fs.readFileSync(TARGETS_FILE, 'utf8');
        const targets = JSON.parse(data);
        if (userId) {
            return targets.filter(t => t.userId === userId).sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        return targets;
    } catch (err) {
        return [];
    }
}

function saveTargets(targets) {
    fs.writeFileSync(TARGETS_FILE, JSON.stringify(targets, null, 2));
}

function saveUserTargets(userId, userTargets) {
    const allTargets = getTargets().filter(t => t.userId !== userId);
    const updatedTargets = [...allTargets, ...userTargets];
    saveTargets(updatedTargets);
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
        let targets = getTargets();

        // Filter targets: only ping if userId is in activeUserIds
        // If it's a legacy target without userId (unlikely now), we might keep it or skip it.
        // Assuming all targets should have userId now.
        targets = targets.filter(t => activeUserIds.has(t.userId));

        if (targets.length === 0) {
            // console.log('No hay usuarios activos, pings en pausa...');
            return;
        }

        console.log(`Ejecutando pings para ${targets.length} servidores de usuarios activos...`);

        await Promise.all(targets.map(async (target) => {
            const result = await pingIP(target.ip);
            const timestamp = new Date().toISOString();

            // Init or update stats state
            if (!statsState[target.id]) {
                statsState[target.id] = {
                    sq: 0,
                    rp: 0,
                    lp: 0,
                    min: result.alive ? result.time : Infinity,
                    max: result.alive ? result.time : 0,
                    avg: 0,
                    sum: 0
                };
            }

            const s = statsState[target.id];
            s.sq++;
            if (result.alive) {
                s.rp++;
                s.sum += result.time;
                s.avg = s.sum / s.rp;
                if (result.time < s.min) s.min = result.time;
                if (result.time > s.max) s.max = result.time;
            } else {
                s.lp++;
            }

            const ppl = ((s.lp / s.sq) * 100).toFixed(1);

            const payload = {
                ...target,
                alive: result.alive,
                latency: result.time,
                timestamp,
                stats: {
                    sq: s.sq,
                    rp: s.rp,
                    lp: s.lp,
                    ppl: ppl,
                    min: s.min === Infinity ? 0 : s.min.toFixed(1),
                    max: s.max.toFixed(1),
                    avg: s.avg.toFixed(1)
                }
            };

            if (target.userId) {
                io.to(target.userId).emit('ping-result', payload);
            } else {
                io.emit('ping-result', payload);
            }

            if (previousStatus[target.id] !== undefined && previousStatus[target.id] !== result.alive) {
                const statusStr = result.alive ? '✅ RECUPERADO' : '❌ CAÍDO';
                sendNotification(`Servicio: ${target.name}\nIP: ${target.ip}\nEstado: ${statusStr}\nFecha: ${timestamp}`);

                // Audio alert notification for client
                if (target.userId) {
                    io.to(target.userId).emit('status-change', {
                        id: target.id,
                        name: target.name,
                        status: result.alive ? 'recovered' : 'down'
                    });
                }
            }
            previousStatus[target.id] = result.alive;
        }));
    };

    if (monitorInterval) clearInterval(monitorInterval);
    runPings();
    monitorInterval = setInterval(runPings, 1000); // 1 second for real-time stats
}

module.exports = { startMonitoring, getTargets, saveTargets, saveUserTargets, setActiveUsers };
