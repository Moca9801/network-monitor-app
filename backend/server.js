require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const net = require('net');
const {
  clearTargetState,
  getTargets,
  saveUserTargets,
  setActiveUsers,
  startMonitoring,
  testNotificationForSettings
} = require('./monitor');
const { corsOptions, socketCorsOptions } = require('./config');
const { getUserSites, register, login, verifyToken, updateUserSettings, updateUserSites } = require('./auth');

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const MAX_TEXT_LENGTH = 120;
const HOSTNAME_RE = /^[a-zA-Z0-9.-]+$/;

function isNonEmptyString(value, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isValidHost(value) {
  const host = typeof value === 'string' ? value.trim() : '';
  return host.length > 0 && host.length <= 255 && (net.isIP(host) !== 0 || HOSTNAME_RE.test(host));
}

function normalizeTarget(input) {
  if (!input || !isNonEmptyString(input.name) || !isValidHost(input.ip)) {
    return null;
  }

  return {
    name: input.name.trim(),
    ip: input.ip.trim(),
    description: typeof input.description === 'string' ? input.description.trim().slice(0, 500) : '',
    category: isNonEmptyString(input.category, 50) ? input.category.trim() : 'Otros',
    type: isNonEmptyString(input.type, 50) ? input.type.trim() : 'Otros'
  };
}

function normalizeSiteName(value) {
  return isNonEmptyString(value, 50) ? value.trim() : null;
}

function uniqueSites(sites) {
  const normalizedSites = sites
    .map(normalizeSiteName)
    .filter(Boolean);
  return Array.from(new Set([...normalizedSites, 'Otros']));
}

function getSitesForUser(userId) {
  const savedSites = getUserSites(userId);
  const targetSites = getTargets(userId).map(target => target.category || 'Otros');
  return uniqueSites([...savedSites, ...targetSites]);
}

function isValidTelegramSettings(settings) {
  return settings &&
    isNonEmptyString(settings.telegramToken, 200) &&
    isNonEmptyString(settings.telegramChatId, 80);
}

// Auth Endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!isNonEmptyString(username, 50) || !isNonEmptyString(password, 200) || password.length < 8) {
      return res.status(400).json({ error: 'Usuario o contraseña inválidos' });
    }
    const user = await register(username, password);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!isNonEmptyString(username, 50) || !isNonEmptyString(password, 200)) {
      return res.status(400).json({ error: 'Usuario o contraseña inválidos' });
    }
    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: socketCorsOptions
});

const activeUsers = new Set();

// Socket.io Middleware for Auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Token inválido'));
  }
  socket.user = decoded;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`Cliente conectado: ${socket.id} (User: ${userId})`);

  activeUsers.add(userId);
  setActiveUsers(activeUsers);

  // Unir al usuario a su propio room para recibir sus pings
  socket.join(userId);

  // Enviar lista inicial de objetivos del usuario
  socket.emit('initial-targets', getTargets(userId));
  socket.emit('user-sites', getSitesForUser(userId));

  // Agregar nuevo objetivo
  socket.on('add-target', (newTarget) => {
    const normalizedTarget = normalizeTarget(newTarget);
    if (!normalizedTarget) {
      return socket.emit('target-error', { message: 'Datos del objetivo inválidos' });
    }

    const targets = getTargets(userId);
    const sites = getSitesForUser(userId);
    if (!sites.includes(normalizedTarget.category)) {
      sites.push(normalizedTarget.category);
      updateUserSites(userId, uniqueSites(sites));
      socket.emit('user-sites', getSitesForUser(userId));
    }

    const id = Date.now().toString();
    const targetWithId = {
      ...normalizedTarget,
      id,
      userId,
      audioAlert: true,
      order: targets.length
    };
    targets.push(targetWithId);
    saveUserTargets(userId, targets);

    // Notificar solo a este usuario
    io.to(userId).emit('initial-targets', targets);
    startMonitoring(io);
  });

  socket.on('add-site', (siteName) => {
    const normalizedSite = normalizeSiteName(siteName);
    if (!normalizedSite) {
      return socket.emit('sites-updated', { success: false, error: 'Nombre de sede inválido' });
    }

    const sites = uniqueSites([...getSitesForUser(userId), normalizedSite]);
    const success = updateUserSites(userId, sites);
    socket.emit('user-sites', sites);
    socket.emit('sites-updated', { success });
  });

  socket.on('remove-site', (siteName) => {
    const normalizedSite = normalizeSiteName(siteName);
    if (!normalizedSite || normalizedSite === 'Otros') {
      return socket.emit('sites-updated', { success: false, error: 'No se puede eliminar esta sede' });
    }

    const targets = getTargets(userId);
    if (targets.some(target => target.category === normalizedSite)) {
      return socket.emit('sites-updated', {
        success: false,
        error: 'No puedes eliminar una sede que tiene equipos asignados'
      });
    }

    const sites = uniqueSites(getSitesForUser(userId).filter(site => site !== normalizedSite));
    const success = updateUserSites(userId, sites);
    socket.emit('user-sites', sites);
    socket.emit('sites-updated', { success });
  });

  // Reordenar objetivos
  socket.on('reorder-targets', (newOrder) => {
    if (!Array.isArray(newOrder) || newOrder.some(id => typeof id !== 'string')) {
      return socket.emit('target-error', { message: 'Orden inválido' });
    }

    // newOrder should be an array of IDs in the desired order
    const allTargets = getTargets();
    const userTargets = allTargets.filter(t => t.userId === userId);

    // Update order property
    const updatedUserTargets = userTargets.map(t => {
      const newIdx = newOrder.indexOf(t.id);
      return { ...t, order: newIdx !== -1 ? newIdx : t.order };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    saveUserTargets(userId, updatedUserTargets);
    io.to(userId).emit('initial-targets', updatedUserTargets);
  });

  // Actualizar configuración de un objetivo (ej: bocina)
  socket.on('update-target-settings', (data) => {
    if (!data) {
      return socket.emit('target-error', { message: 'Configuración inválida' });
    }

    const { id, settings } = data;
    if (typeof id !== 'string' || !settings || typeof settings.audioAlert !== 'boolean') {
      return socket.emit('target-error', { message: 'Configuración inválida' });
    }

    const targets = getTargets(userId);
    const idx = targets.findIndex(t => t.id === id);
    if (idx !== -1) {
      targets[idx] = { ...targets[idx], audioAlert: settings.audioAlert };
      saveUserTargets(userId, targets);
      io.to(userId).emit('initial-targets', targets);
    }
  });

  // Editar datos completos de un objetivo
  socket.on('edit-target', (updatedTarget) => {
    if (!updatedTarget || typeof updatedTarget.id !== 'string') {
      return socket.emit('target-error', { message: 'Objetivo inválido' });
    }

    const normalizedTarget = normalizeTarget(updatedTarget);
    if (!normalizedTarget) {
      return socket.emit('target-error', { message: 'Datos del objetivo inválidos' });
    }

    const targets = getTargets(userId);
    const idx = targets.findIndex(t => t.id === updatedTarget.id);
    if (idx !== -1) {
      targets[idx] = {
        ...targets[idx],
        ...normalizedTarget,
        userId // Asegurar que el userId no se pierda/cambie
      };
      saveUserTargets(userId, targets);
      io.to(userId).emit('initial-targets', targets);
      // Reiniciar monitoreo para aplicar cambios de IP si aplica
      startMonitoring(io);
    }
  });

  // Eliminar objetivo
  socket.on('remove-target', (id) => {
    if (typeof id !== 'string') {
      return socket.emit('target-error', { message: 'Objetivo inválido' });
    }

    let targets = getTargets(userId);
    targets = targets.filter(t => t.id !== id);
    saveUserTargets(userId, targets);
    clearTargetState(id);

    io.to(userId).emit('initial-targets', targets);
    startMonitoring(io);
  });

  // Actualizar configuración de notificaciones de Telegram
  socket.on('update-notification-settings', (settings) => {
    if (!isValidTelegramSettings(settings)) {
      return socket.emit('notification-settings-updated', { success: false, error: 'Configuración inválida' });
    }

    const success = updateUserSettings(userId, {
      telegramToken: settings.telegramToken.trim(),
      telegramChatId: settings.telegramChatId.trim()
    });
    socket.emit('notification-settings-updated', { success });
  });

  socket.on('test-telegram-notification', async (settings) => {
    if (!isValidTelegramSettings(settings)) {
      return socket.emit('test-notification-result', { success: false, error: 'Configuración inválida' });
    }

    const result = await testNotificationForSettings({
      telegramToken: settings.telegramToken.trim(),
      telegramChatId: settings.telegramChatId.trim()
    });
    socket.emit('test-notification-result', result);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Check if user has other sockets
    const userSockets = Array.from(io.sockets.sockets.values()).filter(s => s.user?.id === userId);
    if (userSockets.length === 0) {
      activeUsers.delete(userId);
      setActiveUsers(activeUsers);
    }
  });
});

// Iniciar loop de monitoreo
startMonitoring(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend de monitoreo corriendo en puerto ${PORT}`);
});
