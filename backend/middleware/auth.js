/**
 * Middleware de Autenticación JWT
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Verifica el token JWT en las solicitudes
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación',
        code: 'NO_TOKEN'
      });
    }

    // Verificar formato del token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Adjuntar usuario a la solicitud
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    logger.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en servidor de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Verifica roles específicos
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Verifica que el usuario sea propietario de un recurso
 */
const isOwner = (Model, paramName = 'id', ownerField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findByPk(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource[ownerField] !== req.user.id && req.user.role !== 'landlord') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso sobre este recurso',
          code: 'NOT_OWNER'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Error en verificación de propietario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando permisos',
        code: 'OWNER_CHECK_ERROR'
      });
    }
  };
};

/**
 * Genera token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '1h' 
    }
  );
};

/**
 * Decodifica el token sin verificar (para obtener tiempo de expiración)
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticate,
  authorize,
  isOwner,
  generateToken,
  decodeToken
};
