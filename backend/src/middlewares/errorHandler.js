import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled Exception in [${req.method}] ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
