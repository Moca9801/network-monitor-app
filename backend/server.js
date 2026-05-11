require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const {
  clearTargetState,
  ensureDemoTargets,
  getTargets,
  saveUserTargets,
  setActiveUsers,
  startMonitoring,
  testNotificationForSettings
} = require('./monitor');
const { corsOptions, demoMode, demoPassword, demoUsername, maxTargetsPerUser, socketCorsOptions } = require('./config');
const {
  ensureDemoUser,
  getUserSites,
  register,
  login,
  verifyToken,
  updateUserSettings,
  updateUserSites
} = require('./auth');
const {
  credentialsSchema,
  editTargetSchema,
  loginSchema,
  parseSchema,
  reorderSchema,
  siteNameSchema,
  targetIdSchema,
  targetSchema,
  targetSettingsSchema,
  telegramSettingsSchema
} = require('./validation');

const app = express();
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

const startedAt = new Date();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' }
});

function uniqueSites(sites) {
  const normalizedSites = sites
    .map(site => parseSchema(siteNameSchema, site))
    .filter(Boolean);
  return Array.from(new Set([...normalizedSites, 'Otros']));
}

function getSitesForUser(userId) {
  const savedSites = getUserSites(userId);
  const targetSites = getTargets(userId).map(target => target.category || 'Otros');
  return uniqueSites([...savedSites, ...targetSites]);
}

function createSocketLimiter(limit, windowMs) {
  const calls = new Map();
  return (socket, eventName) => {
    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    const current = calls.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count++;
    calls.set(key, current);
    return current.count <= limit;
  };
}

const socketLimiter = createSocketLimiter(60, 60 * 1000);

function getHealthPayload() {
  const targets = getTargets();
  return {
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    demoMode,
    activeUsers: activeUsers.size,
    totalTargets: targets.length,
    monitoredTargets: targets.filter(target => activeUsers.has(target.userId)).length
  };
}

function isDemoWriteBlocked(socket) {
  if (!demoMode) return false;
  socket.emit('target-error', {
    message: 'La demo es de solo lectura. Despliega tu propia instancia para editar objetivos.'
  });
  return true;
}

function emitDemoSettingsBlocked(socket) {
  socket.emit('notification-settings-updated', {
    success: false,
    error: 'La demo no permite guardar credenciales. Despliega tu propia instancia para configurar Telegram.'
  });
}

app.get('/health', (req, res) => {
  res.json(getHealthPayload());
});

app.get('/api/demo', async (req, res) => {
  if (!demoMode) {
    return res.status(404).json({ error: 'Demo no habilitada' });
  }

  const user = await ensureDemoUser();
  ensureDemoTargets(user.id);
  res.json({
    username: demoUsername,
    password: demoPassword,
    readOnly: true
  });
});

// Auth Endpoints
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    if (demoMode) {
      return res.status(403).json({ error: 'El registro está deshabilitado en modo demo' });
    }

    const body = parseSchema(credentialsSchema, req.body);
    if (!body) {
      return res.status(400).json({ error: 'Usuario o contraseña inválidos' });
    }
    const user = await register(body.username, body.password);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const body = parseSchema(loginSchema, req.body);
    if (!body) {
      return res.status(400).json({ error: 'Usuario o contraseña inválidos' });
    }
    const result = await login(body.username, body.password);
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
  if (demoMode && socket.user.username === demoUsername) {
    ensureDemoTargets(userId);
  }
  socket.emit('initial-targets', getTargets(userId));
  socket.emit('user-sites', getSitesForUser(userId));

  // Agregar nuevo objetivo
  socket.on('add-target', (newTarget) => {
    if (isDemoWriteBlocked(socket)) return;

    if (!socketLimiter(socket, 'add-target')) {
      return socket.emit('target-error', { message: 'Demasiadas acciones. Intenta más tarde.' });
    }

    const normalizedTarget = parseSchema(targetSchema, newTarget);
    if (!normalizedTarget) {
      return socket.emit('target-error', { message: 'Datos del objetivo inválidos' });
    }

    const targets = getTargets(userId);
    if (targets.length >= maxTargetsPerUser) {
      return socket.emit('target-error', { message: `Límite de ${maxTargetsPerUser} equipos alcanzado` });
    }

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
    if (isDemoWriteBlocked(socket)) return;

    if (!socketLimiter(socket, 'add-site')) {
      return socket.emit('sites-updated', { success: false, error: 'Demasiadas acciones. Intenta más tarde.' });
    }

    const normalizedSite = parseSchema(siteNameSchema, siteName);
    if (!normalizedSite) {
      return socket.emit('sites-updated', { success: false, error: 'Nombre de sede inválido' });
    }

    const sites = uniqueSites([...getSitesForUser(userId), normalizedSite]);
    const success = updateUserSites(userId, sites);
    socket.emit('user-sites', sites);
    socket.emit('sites-updated', { success });
  });

  socket.on('remove-site', (siteName) => {
    if (isDemoWriteBlocked(socket)) return;

    if (!socketLimiter(socket, 'remove-site')) {
      return socket.emit('sites-updated', { success: false, error: 'Demasiadas acciones. Intenta más tarde.' });
    }

    const normalizedSite = parseSchema(siteNameSchema, siteName);
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
    if (isDemoWriteBlocked(socket)) return;

    const parsedOrder = parseSchema(reorderSchema, newOrder);
    if (!parsedOrder) {
      return socket.emit('target-error', { message: 'Orden inválido' });
    }

    // newOrder should be an array of IDs in the desired order
    const allTargets = getTargets();
    const userTargets = allTargets.filter(t => t.userId === userId);

    // Update order property
    const updatedUserTargets = userTargets.map(t => {
      const newIdx = parsedOrder.indexOf(t.id);
      return { ...t, order: newIdx !== -1 ? newIdx : t.order };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    saveUserTargets(userId, updatedUserTargets);
    io.to(userId).emit('initial-targets', updatedUserTargets);
  });

  // Actualizar configuración de un objetivo (ej: bocina)
  socket.on('update-target-settings', (data) => {
    if (isDemoWriteBlocked(socket)) return;

    const parsed = parseSchema(targetSettingsSchema, data);
    if (!parsed) {
      return socket.emit('target-error', { message: 'Configuración inválida' });
    }

    const { id, settings } = parsed;
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
    if (isDemoWriteBlocked(socket)) return;

    if (!socketLimiter(socket, 'edit-target')) {
      return socket.emit('target-error', { message: 'Demasiadas acciones. Intenta más tarde.' });
    }

    const normalizedTarget = parseSchema(editTargetSchema, updatedTarget);
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
    if (isDemoWriteBlocked(socket)) return;

    const parsedId = parseSchema(targetIdSchema, id);
    if (!parsedId) {
      return socket.emit('target-error', { message: 'Objetivo inválido' });
    }

    let targets = getTargets(userId);
    targets = targets.filter(t => t.id !== parsedId);
    saveUserTargets(userId, targets);
    clearTargetState(parsedId);

    io.to(userId).emit('initial-targets', targets);
    startMonitoring(io);
  });

  // Actualizar configuración de notificaciones de Telegram
  socket.on('update-notification-settings', (settings) => {
    if (demoMode) {
      return emitDemoSettingsBlocked(socket);
    }

    const parsed = parseSchema(telegramSettingsSchema, settings);
    if (!parsed) {
      return socket.emit('notification-settings-updated', { success: false, error: 'Configuración inválida' });
    }

    const success = updateUserSettings(userId, {
      telegramToken: parsed.telegramToken,
      telegramChatId: parsed.telegramChatId
    });
    socket.emit('notification-settings-updated', { success });
  });

  socket.on('test-telegram-notification', async (settings) => {
    if (demoMode) {
      return socket.emit('test-notification-result', {
        success: false,
        error: 'La demo no envía notificaciones reales.'
      });
    }

    const parsed = parseSchema(telegramSettingsSchema, settings);
    if (!parsed) {
      return socket.emit('test-notification-result', { success: false, error: 'Configuración inválida' });
    }

    const result = await testNotificationForSettings({
      telegramToken: parsed.telegramToken,
      telegramChatId: parsed.telegramChatId
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

function startServer() {
  if (demoMode) {
    ensureDemoUser()
      .then(user => ensureDemoTargets(user.id))
      .catch(err => console.error('No se pudo preparar la demo:', err.message));
  }

  startMonitoring(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Backend de monitoreo corriendo en puerto ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  getHealthPayload,
  server,
  startServer
};
