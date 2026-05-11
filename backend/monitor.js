const ping = require('ping');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getUserById } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const TARGETS_FILE = path.join(DATA_DIR, 'targets.json');

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
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpFile = `${TARGETS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(targets, null, 2));
    fs.renameSync(tmpFile, TARGETS_FILE);
}

function saveUserTargets(userId, userTargets) {
    const allTargets = getTargets().filter(t => t.userId !== userId);
    const updatedTargets = [...allTargets, ...userTargets];
    saveTargets(updatedTargets);
}

function ensureDemoTargets(userId) {
    const existingTargets = getTargets(userId);
    if (existingTargets.length > 0) return existingTargets;

    const demoTargets = [
        {
            id: 'demo-cloudflare-dns',
            userId,
            name: 'Cloudflare DNS',
            ip: '1.1.1.1',
            description: 'Objetivo público de ejemplo para demo.',
            category: 'Cloud',
            type: 'Servidor',
            audioAlert: false,
            order: 0
        },
        {
            id: 'demo-google-dns',
            userId,
            name: 'Google DNS',
            ip: '8.8.8.8',
            description: 'Objetivo público de ejemplo para demo.',
            category: 'Demo',
            type: 'Servidor',
            audioAlert: false,
            order: 1
        },
        {
            id: 'demo-example',
            userId,
            name: 'Example Site',
            ip: 'example.com',
            description: 'Hostname público de ejemplo.',
            category: 'Demo',
            type: 'Enlace',
            audioAlert: false,
            order: 2
        }
    ];

    saveUserTargets(userId, demoTargets);
    return demoTargets;
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

function sendTelegramMessage(botToken, chatId, message) {
    return new Promise((resolve) => {
        if (!botToken || !chatId || botToken === 'tu_telegram_bot_token_aqui') {
            return resolve({ success: false, error: 'Token o Chat ID no configurados' });
        }

        const teleData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });

        const teleOptions = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(teleData)
            }
        };

        const teleReq = https.request(teleOptions, (res) => {
            let body = '';
            res.on('data', chunk => {
                body += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    return resolve({ success: true });
                }
                return resolve({ success: false, error: body || `HTTP ${res.statusCode}` });
            });
        });

        teleReq.on('error', (e) => {
            resolve({ success: false, error: e.message });
        });
        teleReq.write(teleData);
        teleReq.end();
    });
}

async function testNotificationForSettings(settings) {
    return sendTelegramMessage(
        settings.telegramToken,
        settings.telegramChatId,
        '✅ <b>Prueba exitosa</b>\nLas alertas de Network Monitor están configuradas correctamente.'
    );
}

async function sendNotification(message, userId = null) {
    console.log(`[ALERTA]: ${message}`);

    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    // Try to get user-specific settings if userId is provided
    if (userId) {
        const user = getUserById(userId);
        if (user && user.telegramToken && user.telegramChatId) {
            botToken = user.telegramToken;
            chatId = user.telegramChatId;
        }
    }

    // 1. Telegram Notification
    const teleResult = await sendTelegramMessage(botToken, chatId, message);
    if (!teleResult.success && teleResult.error !== 'Token o Chat ID no configurados') {
        console.error(`Error en notificación Telegram: ${teleResult.error}`);
    }

    // 2. Generic Webhook Notification (Keep for compatibility)
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK;
    if (!webhookUrl) return;

    const data = JSON.stringify({ text: message });
    try {
        const url = new URL(webhookUrl);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
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
            console.error(`Error en notificación Webhook: ${e.message}`);
        });
        req.write(data);
        req.end();
    } catch (e) {
        console.error(`URL de webhook inválida: ${webhookUrl}`);
    }
}

let monitorInterval = null;
const previousStatus = {};

// --- Alert thresholds ---
// How many consecutive ping failures before sending a DOWN alert.
// At a 1-second interval: 3 = ~3s, 5 = ~5s.
// Industry standard (Zabbix/Nagios default) is 3 consecutive failures.
const FAIL_THRESHOLD = 3;

// Per-target state for flap prevention
const alertState = {};
// Structure per target:
//   consecutiveFails: number  — running count of consecutive failed pings
//   alertSent: boolean        — true if a DOWN alert has been sent (avoids repeating)

function clearTargetState(targetId) {
    delete statsState[targetId];
    delete previousStatus[targetId];
    delete alertState[targetId];
}

function startMonitoring(io) {
    let isRunning = false;

    const runPings = async () => {
        if (isRunning) return;
        isRunning = true;

        try {
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

            // --- Flap-prevention alerting ---
            if (!alertState[target.id]) {
                alertState[target.id] = { consecutiveFails: 0, alertSent: false };
            }
            const as = alertState[target.id];

            if (!result.alive) {
                as.consecutiveFails++;
                // Fire the DOWN alert only once, after the threshold is exceeded
                if (as.consecutiveFails >= FAIL_THRESHOLD && !as.alertSent) {
                    as.alertSent = true;
                    sendNotification(
                        `⚠️ <b>EQUIPO CAÍDO</b>\n` +
                        `Servicio: <b>${target.name}</b>\n` +
                        `IP: <code>${target.ip}</code>\n` +
                        `Caído por: ${as.consecutiveFails} pings consecutivos (~${as.consecutiveFails}s)\n` +
                        `Fecha: ${timestamp}`,
                        target.userId
                    );
                    // Notify frontend to play audio alert
                    if (target.userId) {
                        io.to(target.userId).emit('status-change', { id: target.id, name: target.name, status: 'down' });
                    }
                }
            } else {
                // Host recovered — send recovery alert only if a confirmed outage was active
                if (as.alertSent) {
                    sendNotification(
                        `✅ <b>EQUIPO RECUPERADO</b>\n` +
                        `Servicio: <b>${target.name}</b>\n` +
                        `IP: <code>${target.ip}</code>\n` +
                        `RTT actual: ${result.time}ms\n` +
                        `Fecha: ${timestamp}`,
                        target.userId
                    );
                    if (target.userId) {
                        io.to(target.userId).emit('status-change', { id: target.id, name: target.name, status: 'recovered' });
                    }
                }
                // Reset counters on any successful ping
                as.consecutiveFails = 0;
                as.alertSent = false;
            }

            previousStatus[target.id] = result.alive;

        }));
        } finally {
            isRunning = false;
        }
    };

    if (monitorInterval) clearInterval(monitorInterval);
    runPings();
    monitorInterval = setInterval(runPings, 1000); // 1 second for real-time stats
}

module.exports = {
    clearTargetState,
    getTargets,
    ensureDemoTargets,
    saveTargets,
    saveUserTargets,
    setActiveUsers,
    startMonitoring,
    testNotificationForSettings
};
