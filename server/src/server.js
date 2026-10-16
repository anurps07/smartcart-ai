import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const server = http.createServer(app);

// Initialize Socket.IO with authorized CORS origins
const io = new SocketIOServer(server, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket connection lifecycle & authentication placeholder
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Export io instance for use in domain notification services
export { io };

// Bootstrap server
const startServer = async () => {
  // Connect to Database
  await connectDB();

  server.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 SmartCart AI Backend Server Running!`);
    console.log(`📍 URL: http://localhost:${env.PORT}`);
    console.log(`🩺 Health: http://localhost:${env.PORT}/api/health`);
    console.log(`🌐 Mode: ${env.NODE_ENV}`);
    console.log(`===============================================`);
  });
};

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
