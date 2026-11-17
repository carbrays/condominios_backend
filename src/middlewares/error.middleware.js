const { errorResponse } = require('../utils/response.util');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error inesperado en el servidor';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  return errorResponse(res, message, code, statusCode);
};

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
