require('dotenv').config();
const https = require('https');

async function testTelegram(message) {
    console.log(`Intentando enviar mensaje de prueba: ${message}`);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || botToken === 'tu_telegram_bot_token_aqui') {
        console.error('ERROR: TELEGRAM_BOT_TOKEN no configurado en .env');
        return;
    }
    if (!chatId || chatId === 'tu_telegram_chat_id_aqui') {
        console.error('ERROR: TELEGRAM_CHAT_ID no configurado en .env');
        return;
    }

    const teleData = JSON.stringify({
        chat_id: chatId,
        text: `<b>[TEST MONITOR]</b>\n${message}`,
        parse_mode: 'HTML'
    });

    const teleOptions = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': teleData.length
        }
    };

    const teleReq = https.request(teleOptions, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Mensaje de prueba enviado con éxito a Telegram');
            } else {
                console.error(`❌ Error de Telegram (Status ${res.statusCode}):`, responseData);
            }
        });
    });

    teleReq.on('error', (e) => {
        console.error(`❌ Error en la petición: ${e.message}`);
    });

    teleReq.write(teleData);
    teleReq.end();
}

testTelegram('Esta es una prueba de conexión desde el Monitor de Red.');
