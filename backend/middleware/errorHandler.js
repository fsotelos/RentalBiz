/**
 * Manejador de Errores
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const logger = require('../utils/logger');

/**
 * Error personalizado de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación de Sequelize
 */
const handleSequelizeValidationError = (err) => {
  const messages = err.errors.map(e => e.message);
  return new AppError(`Error de validación: ${messages.join(', ')}`, 400, 'SEQUELIZE_VALIDATION_ERROR');
};

/**
 * Error de clave duplicada de Sequelize
 */
const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors[0]?.path || 'campo';
  return new AppError(`El valor para '${field}' ya existe`, 400, 'SEQUELIZE_DUPLICATE_ERROR');
};

/**
 * Error de clave foránea de Sequelize
 */
const handleSequelizeForeignKeyError = (err) => {
  return new AppError('Referencia a registro no válido', 400, 'SEQUELIZE_FOREIGN_KEY_ERROR');
};

/**
 * Error de eliminación restringida de Sequelize
 */
const handleSequelizeDeleteError = (err) => {
  return new AppError('No se puede eliminar el registro porque tiene dependencias', 409, 'SEQUELIZE_DELETE_ERROR');
};

/**
 * Manejador de errores global
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log del error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Manejar errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    error = handleSequelizeValidationError(err);
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = handleSequelizeUniqueConstraintError(err);
  }
  
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = handleSequelizeForeignKeyError(err);
  }
  
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    error = handleSequelizeDeleteError(err);
  }

  // Error de recurso no encontrado
  if (err.name === 'CastError') {
    error = new AppError('ID inválido', 400, 'INVALID_ID');
  }

  // Error de duplicación de clave en MongoDB/Mongoose
  if (err.code === 11000) {
    error = new AppError('El valor ya existe', 400, 'DUPLICATE_KEY');
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Token inválido', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expirado', 401, 'TOKEN_EXPIRED');
  }

  // Responder al cliente
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';
  const code = error.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: err
    })
  });
};

/**
 * Manejador de rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler
};
