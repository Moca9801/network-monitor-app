require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { startMonitoring, getTargets, saveUserTargets, setActiveUsers } = require('./monitor');
const { register, login, verifyToken, getUserById, updateUserSettings } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Auth Endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await register(username, password);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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

  // Agregar nuevo objetivo
  socket.on('add-target', (newTarget) => {
    const targets = getTargets(userId);
    const id = Date.now().toString();
    const targetWithId = {
      ...newTarget,
      id,
      userId,
      category: newTarget.category || 'Otros',
      type: newTarget.type || 'Otros',
      audioAlert: true,
      order: targets.length
    };
    targets.push(targetWithId);
    saveUserTargets(userId, targets);

    // Notificar solo a este usuario
    io.to(userId).emit('initial-targets', targets);
    startMonitoring(io);
  });

  // Reordenar objetivos
  socket.on('reorder-targets', (newOrder) => {
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
    const { id, settings } = data;
    const targets = getTargets(userId);
    const idx = targets.findIndex(t => t.id === id);
    if (idx !== -1) {
      targets[idx] = { ...targets[idx], ...settings };
      saveUserTargets(userId, targets);
      io.to(userId).emit('initial-targets', targets);
    }
  });

  // Editar datos completos de un objetivo
  socket.on('edit-target', (updatedTarget) => {
    const targets = getTargets(userId);
    const idx = targets.findIndex(t => t.id === updatedTarget.id);
    if (idx !== -1) {
      targets[idx] = {
        ...targets[idx],
        ...updatedTarget,
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
    let targets = getTargets(userId);
    targets = targets.filter(t => t.id !== id);
    saveUserTargets(userId, targets);

    io.to(userId).emit('initial-targets', targets);
    startMonitoring(io);
  });

  // Actualizar configuración de notificaciones de Telegram
  socket.on('update-notification-settings', (settings) => {
    const success = updateUserSettings(userId, {
      telegramToken: settings.telegramToken,
      telegramChatId: settings.telegramChatId
    });
    if (success) {
      socket.emit('notification-settings-updated', { success: true });
    }
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
