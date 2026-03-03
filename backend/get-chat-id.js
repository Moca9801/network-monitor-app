require('dotenv').config();
const https = require('https');

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken || botToken === 'tu_telegram_bot_token_aqui') {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no configurado en .env');
    console.log('Por favor, edita el archivo .env con el token que te dio @BotFather y guarda el archivo.');
    process.exit(1);
}

console.log('🔍 Buscando Chat ID...');
console.log('⚠️  PASO IMPORTANTE: Envía cualquier mensaje a tu bot en Telegram AHORA para que pueda detectarte.');

const getUpdates = () => {
    https.get(`https://api.telegram.org/bot${botToken}/getUpdates`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const response = JSON.parse(data);
            if (response.ok && response.result.length > 0) {
                const latestUpdate = response.result[response.result.length - 1];
                const chatId = latestUpdate.message ? latestUpdate.message.chat.id : null;
                const firstName = latestUpdate.message ? latestUpdate.message.chat.first_name : 'Usuario';

                if (chatId) {
                    console.log('\n✅ ¡Chat ID encontrado!');
                    console.log(`👤 Usuario: ${firstName}`);
                    console.log(`🆔 Chat ID: ${chatId}`);
                    console.log('\nCopia este ID en tu archivo .env en la línea TELEGRAM_CHAT_ID=');
                } else {
                    console.log('No se pudo determinar el ID del chat. Intenta enviar otro mensaje al bot.');
                }
            } else {
                console.log('... Aún no recibo mensajes. Por favor, asegúrate de haberle escrito al bot en Telegram.');
                setTimeout(getUpdates, 3000); // Reintentar cada 3 segundos
            }
        });
    }).on('error', (e) => {
        console.error(`❌ Error de conexión: ${e.message}`);
    });
};

getUpdates();
