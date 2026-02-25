const ping = require('ping');

/**
 * Pings an IP address and returns status and latency.
 * @param {string} ip 
 * @returns {Promise<{alive: boolean, time: number}>}
 */
async function pingIP(ip) {
    try {
        const res = await ping.promise.probe(ip, {
            timeout: 10,
        });
        return {
            alive: res.alive,
            time: res.time === 'unknown' ? 0 : parseFloat(res.time)
        };
    } catch (err) {
        console.error(`Error pinging ${ip}:`, err);
        return { alive: false, time: 0 };
    }
}

/**
 * Sends a notification to a webhook (Mock implementation for Telegram/Slack).
 * @param {string} message 
 */
function sendNotification(message) {
    console.log(`[ALERTA]: ${message}`);
    // In a real scenario, use axios.post(webhookUrl, { text: message })
}

/**
 * Main monitoring loop.
 * @param {object} io Socket.io server instance
 * @param {Array} targets IPs to monitor
 */
function startMonitoring(io, targets) {
    const previousStatus = {};

    const runPings = async () => {
        console.log(`Running pings for ${targets.length} targets...`);

        for (const target of targets) {
            const result = await pingIP(target.ip);
            const timestamp = new Date().toISOString();

            const payload = {
                id: target.id,
                name: target.name,
                ip: target.ip,
                alive: result.alive,
                latency: result.time,
                timestamp
            };

            // Emit to all connected clients
            io.emit('ping-result', payload);

            // Check for state changes to send alerts
            if (previousStatus[target.id] !== undefined && previousStatus[target.id] !== result.alive) {
                const statusStr = result.alive ? 'RECUPERADO' : 'CAÍDO';
                sendNotification(`Servicio ${target.name} (${target.ip}) está ${statusStr} a las ${timestamp}`);
            }

            previousStatus[target.id] = result.alive;
        }
    };

    // Run immediately and then every 60s
    runPings();
    setInterval(runPings, 60000);
}

module.exports = { startMonitoring };
