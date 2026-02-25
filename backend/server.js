const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { startMonitoring } = require('./monitor');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Stateless: IPs to monitor (could be moved to an env var or a config file)
const IPS_TO_MONITOR = [
  { id: 1, name: 'Google DNS', ip: '8.8.8.8' },
  { id: 2, name: 'Cloudflare DNS', ip: '1.1.1.1' },
  { id: 3, name: 'Localhost', ip: '127.0.0.1' }
];

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial list
  socket.emit('initial-targets', IPS_TO_MONITOR);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start monitoring loop
startMonitoring(io, IPS_TO_MONITOR);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
