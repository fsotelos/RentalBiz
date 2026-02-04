/**
 * Controlador de Usuarios
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { User } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Obtener todos los usuarios
 * GET /api/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, is_active, search } = req.query;

    const where = {};

    // Filtrar por rol si se especifica
    if (role) {
      where.role = role;
    }

    // Filtrar por estado activo
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // Búsqueda por nombre o email
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });

    // Agregar campo 'name' combinando first_name y last_name
    const usersWithName = users.map(user => {
      const userData = user.toJSON();
      return {
        ...userData,
        name: `${userData.first_name} ${userData.last_name}`
      };
    });

    res.json({
      success: true,
      data: usersWithName
    });
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    next(error);
  }
};

/**
 * Obtener un usuario por ID
 * GET /api/users/:id
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return next(new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND'));
    }

    const userData = user.toJSON();
    userData.name = `${userData.first_name} ${userData.last_name}`;

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    next(error);
  }
};

/**
 * Obtener todos los inquilinos
 * GET /api/users/tenants
 */
exports.getTenants = async (req, res, next) => {
  try {
    const { search, limit = 100 } = req.query;

    const where = {
      role: 'tenant',
      is_active: true
    };

    // Búsqueda por nombre o email
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const tenants = await User.findAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']],
      limit: parseInt(limit)
    });

    // Agregar campo 'name' combinando first_name y last_name
    const tenantsWithName = tenants.map(tenant => {
      const tenantData = tenant.toJSON();
      return {
        id: tenantData.id,
        name: `${tenantData.first_name} ${tenantData.last_name}`,
        email: tenantData.email,
        phone: tenantData.phone,
        first_name: tenantData.first_name,
        last_name: tenantData.last_name
      };
    });

    res.json({
      success: true,
      data: tenantsWithName
    });
  } catch (error) {
    logger.error('Error al obtener inquilinos:', error);
    next(error);
  }
};
