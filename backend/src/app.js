import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import monitorRoutes from './routes/monitorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
app.use(
  morgan('dev', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// Primary Required Endpoints
app.use('/monitor', monitorRoutes);
app.use('/alerts', alertRoutes);

// Versioned Aliases for API standard practices
app.use('/api/v1/monitor', monitorRoutes);
app.use('/api/v1/alerts', alertRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Intelligent API Monitoring & Alert System',
    timestamp: new Date().toISOString(),
  });
});

// Serve Frontend SPA if built
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/monitor') ||
      req.path.startsWith('/alerts') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/api')
    ) {
      return next();
    }
    if (req.method === 'GET') {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
