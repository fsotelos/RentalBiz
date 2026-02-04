/**
 * Controlador de Autenticación
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Registra un nuevo usuario
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role, phone, address } = req.body;

    // Verificar si el email ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('El email ya está registrado', 400, 'EMAIL_EXISTS'));
    }

    // Crear usuario
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name,
      role: role || 'tenant',
      phone,
      address
    });

    // Generar token
    const token = generateToken(user);

    logger.info(`Nuevo usuario registrado: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Inicia sesión de usuario
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info(`Intento de login para: ${email}`);

    // Validar datos de entrada
    if (!email || !password) {
      return next(new AppError('Email y contraseña son requeridos', 400, 'MISSING_CREDENTIALS'));
    }

    // Buscar usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn(`Usuario no encontrado: ${email}`);
      return next(new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS'));
    }

    // Verificar contraseña
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      logger.warn(`Contraseña inválida para: ${email}`);
      return next(new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS'));
    }

    // Verificar estado del usuario
    if (!user.is_active) {
      logger.warn(`Cuenta inactiva: ${email}`);
      return next(new AppError('Tu cuenta está desactivada', 403, 'ACCOUNT_INACTIVE'));
    }

    // Actualizar último inicio de sesión
    user.last_login = new Date();
    await user.save();

    // Generar token
    const token = generateToken(user);

    logger.info(`Usuario inició sesión exitosamente: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    logger.error('Error en login:', error);
    next(error);
  }
};

/**
 * Obtiene el perfil del usuario autenticado
 * GET /api/auth/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza el perfil del usuario
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, address, avatar, notification_preferences } = req.body;

    // Actualizar campos permitidos
    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (avatar !== undefined) updates.avatar = avatar;
    if (notification_preferences !== undefined) updates.notification_preferences = notification_preferences;

    await req.user.update(updates);

    logger.info(`Perfil actualizado: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambia la contraseña del usuario
 * PUT /api/auth/password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    // Verificar contraseña actual
    const isValidPassword = await req.user.validatePassword(current_password);
    if (!isValidPassword) {
      return next(new AppError('Contraseña actual incorrecta', 400, 'INVALID_PASSWORD'));
    }

    // Actualizar contraseña (se encripta automáticamente por el hook del modelo)
    await req.user.update({ password_hash: new_password });

    logger.info(`Contraseña actualizada: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cierra sesión (invalida token - implementación客户端)
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    logger.info(`Usuario cerró sesión: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica token válido
 * GET /api/auth/verify
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Obtener usuario fresco de la base de datos para asegurar datos actualizados
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return next(new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND'));
    }

    if (!user.is_active) {
      return next(new AppError('Tu cuenta está desactivada', 403, 'ACCOUNT_INACTIVE'));
    }

    res.status(200).json({
      success: true,
      message: 'Token válido',
      data: {
        user: user.toJSON ? user.toJSON() : user
      }
    });
  } catch (error) {
    logger.error('Error al verificar token:', error);
    next(error);
  }
};

/**
 * Refresca el token de autenticación
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // El usuario ya viene autenticado del middleware
    const user = req.user;

    // Generar nuevo token
    const token = generateToken(user);

    logger.info(`Token refrescado para usuario: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token
      }
    });
  } catch (error) {
    next(error);
  }
};
