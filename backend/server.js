const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { startMonitoring, getTargets, saveTargets } = require('./monitor');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Enviar lista inicial de objetivos
  socket.emit('initial-targets', getTargets());

  // Agregar nuevo objetivo
  socket.on('add-target', (newTarget) => {
    const targets = getTargets();
    const id = Date.now().toString();
    const targetWithId = { ...newTarget, id };
    targets.push(targetWithId);
    saveTargets(targets);

    // Notificar a todos los clientes de la nueva lista
    io.emit('initial-targets', targets);
    // Reiniciar monitoreo para incluir el nuevo
    startMonitoring(io);
  });

  // Eliminar objetivo
  socket.on('remove-target', (id) => {
    let targets = getTargets();
    targets = targets.filter(t => t.id !== id);
    saveTargets(targets);

    io.emit('initial-targets', targets);
    startMonitoring(io);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar loop de monitoreo
startMonitoring(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend de monitoreo corriendo en puerto ${PORT}`);
});
