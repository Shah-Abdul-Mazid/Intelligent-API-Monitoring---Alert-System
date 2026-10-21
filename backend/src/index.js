import config from './config/index.js';
import app from './app.js';
import logger from './utils/logger.js';
import { getDb } from './db/database.js';

const PORT = config.port;

// Initialize Database connection
try {
  getDb();
  logger.info('Database connection established successfully.');
} catch (error) {
  logger.error(`Database initialization failure: ${error.message}`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Alerts endpoint: http://localhost:${PORT}/alerts`);
  logger.info(`Monitor endpoint: http://localhost:${PORT}/monitor`);
});

// Explicit error handler for port conflicts or network errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use by another process. Please free port ${PORT} or configure a different PORT in .env.`);
  } else {
    logger.error(`Server error: ${err.message}`);
  }
  process.exit(1);
});

// Graceful shutdown listeners
const shutdown = () => {
  logger.info('Received shutdown signal, closing server and database...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
});

export default server;
