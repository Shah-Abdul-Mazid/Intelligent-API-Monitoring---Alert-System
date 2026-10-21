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

// Graceful shutdown
const shutdown = () => {
  logger.info('Received shutdown signal, closing server and database...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
