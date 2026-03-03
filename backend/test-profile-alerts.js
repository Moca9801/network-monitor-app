require('dotenv').config();
const { getUserById, updateUserSettings } = require('./auth');
const { startMonitoring } = require('./monitor');
const https = require('https');

// 1. Simular un usuario con settings de Telegram
const userId = '1772048027640'; // ID del usuario aimc9801 de users.json
const testToken = process.env.TELEGRAM_BOT_TOKEN;
const testChatId = process.env.TELEGRAM_CHAT_ID;

if (!testToken || testToken === 'tu_telegram_bot_token_aqui') {
    console.error('❌ Configura TELEGRAM_BOT_TOKEN en .env para esta prueba');
    process.exit(1);
}

console.log(`🧪 Iniciando prueba de perfil para usuario: ${userId}`);

// 2. Guardar configuración en el "perfil" del usuario
updateUserSettings(userId, {
    telegramToken: testToken,
    telegramChatId: testChatId
});

console.log('✅ Configuración de perfil guardada.');

// 3. Simular el envío de notificación usando el ID de usuario
const { getUserById: checkUser } = require('./auth');
const user = checkUser(userId);

async function simulateAlert() {
    console.log('🔔 Simulando alerta de servicio caído...');

    // Importamos dinámicamente monitor para usar su sendNotification
    const monitor = require('./monitor');

    const message = `<b>[PRUEBA DE PERFIL]</b>\nServicio: Servidor Central\nEstado: ❌ CAÍDO\nUsuario: ${user.username}`;

    // Esto debería usar los tokens guardados en el perfil del usuario, no los del .env global (aunque sean los mismos para la prueba)
    await monitor.sendNotification(message, userId);

    console.log('🚀 Alerta enviada. Revisa tu Telegram.');
}

simulateAlert();
