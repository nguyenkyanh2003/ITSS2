require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

const port = Number.parseInt(process.env.PORT, 10) || 5000;

let server;
let io;
let shuttingDown = false;

const start = async () => {
  try {
    await connectDB();

    server = http.createServer(app);
    // capture socket.io instance so we can close it on shutdown
    io = initSocket(server);

    // Handle server 'error' events (e.g., EADDRINUSE) to avoid uncaught exceptions
    server.on('error', (err) => {
      console.error('HTTP server error event:', err && err.code ? err.code : err);
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use.`);
        // Gracefully shutdown resources, then exit with error
        gracefulShutdown('EADDRINUSE');
      } else {
        // Unexpected server error — attempt graceful shutdown
        gracefulShutdown('serverError');
      }
    });

    server.listen(port, () => {
      const env = process.env.NODE_ENV || 'development';
      const baseUrl = `http://localhost:${port}`;
      console.log(`Server đang chạy (${env}) tại ${baseUrl}`);
    });
  } catch (err) {
    console.error('Failed to connect to DB or start server', err);
    process.exit(1);
  }
};

const gracefulShutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}. Closing HTTP server, Socket.io and MongoDB connection...`);

  // Stop accepting new connections
  if (server) {
    try {
      if (server.listening) {
        server.close((err) => {
          if (err) {
            console.error('Error while closing HTTP server:', err);
          } else {
            console.log('HTTP server closed.');
          }
        });
      } else {
        console.log('HTTP server not listening, skipping server.close');
      }
    } catch (e) {
      console.error('Failed to close server gracefully:', e);
    }
  }

  // Close socket.io
  try {
    if (io && typeof io.close === 'function') {
      io.close(() => console.log('Socket.io closed.'));
    }
  } catch (e) {
    console.error('Failed to close Socket.io:', e);
  }

  // Close mongoose connection
  mongoose.connection.close(false)
    .then(() => console.log('MongoDB connection closed.'))
    .catch((err) => console.error('Error closing MongoDB connection:', err))
    .finally(() => {
      // Force exit after short timeout in case connections hang
      setTimeout(() => {
        console.log('Exiting process');
        process.exit(0);
      }, 5000).unref();
    });
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Support nodemon restart signal
process.once('SIGUSR2', () => {
  console.log('Received SIGUSR2 (nodemon restart)');
  gracefulShutdown('SIGUSR2');
  // give gracefulShutdown a moment then re-signal for nodemon to restart
  setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 1000).unref();
});

// handle uncaught errors by shutting down gracefully
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection, shutting down:', reason);
  gracefulShutdown('unhandledRejection');
});

start();