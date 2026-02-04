/**
 * Controlador de Propiedades
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Property, Contract, User } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Obtiene todas las propiedades del usuario
 * GET /api/properties
 */
exports.getAllProperties = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      type,
      status,
      city,
      state,
      min_rent,
      max_rent,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Construir filtros
    const where = {};
    
    // Si es arrendador, solo sus propiedades
    if (req.user.role === 'landlord') {
      where.user_id = req.user.id;
    } else {
      // Si es arrendatario, puede ver propiedades disponibles
      where.status = 'available';
    }

    if (type) where.type = type;
    if (status && req.user.role === 'landlord') where.status = status;
    if (city) where.city = { [Op.like]: `%${city}%` };
    if (state) where.state = { [Op.like]: `%${state}%` };
    
    if (min_rent || max_rent) {
      where.monthly_rent = {};
      if (min_rent) where.monthly_rent[Op.gte] = parseFloat(min_rent);
      if (max_rent) where.monthly_rent[Op.lte] = parseFloat(max_rent);
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Ordenamiento
    const order = [[sort_by, sort_order.toUpperCase()]];

    // Configuración de consulta
    const queryOptions = {
      where,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }
      ],
      order,
      distinct: true
    };

    // Solo aplicar paginación si se especifican page y limit
    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      queryOptions.limit = parseInt(limit);
      queryOptions.offset = offset;

      const { count, rows: properties } = await Property.findAndCountAll(queryOptions);

      res.status(200).json({
        success: true,
        data: {
          properties,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } else {
      // Sin paginación, limitar a 100 y solo campos básicos
      queryOptions.limit = 100;
      queryOptions.attributes = ['id', 'name', 'address', 'city', 'state', 'type', 'monthly_rent', 'status'];
      const properties = await Property.findAll(queryOptions);
      
      logger.info(`Devolviendo ${properties.length} propiedades sin paginación para usuario ${req.user.id}`);

      res.status(200).json({
        success: true,
        data: properties
      });
    }
  } catch (error) {
    logger.error('Error al obtener propiedades:', error);
    next(error);
  }
};

/**
 * Obtiene una propiedad por ID
 * GET /api/properties/:id
 */
exports.getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Contract,
          as: 'contracts',
          include: [
            {
              model: User,
              as: 'tenant',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!property) {
      return next(new AppError('Propiedad no encontrada', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Verificar permisos
    if (req.user.role === 'landlord' && property.user_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre esta propiedad', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una nueva propiedad
 * POST /api/properties
 */
exports.createProperty = async (req, res, next) => {
  try {
    const propertyData = {
      ...req.body,
      user_id: req.user.id
    };

    const property = await Property.create(propertyData);

    logger.info(`Propiedad creada: ${property.id} por usuario ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Propiedad creada exitosamente',
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza una propiedad
 * PUT /api/properties/:id
 */
exports.updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return next(new AppError('Propiedad no encontrada', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Verificar propietario
    if (property.user_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre esta propiedad', 403, 'FORBIDDEN'));
    }

    await property.update(req.body);

    logger.info(`Propiedad actualizada: ${property.id} por usuario ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Propiedad actualizada exitosamente',
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una propiedad
 * DELETE /api/properties/:id
 */
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: Contract,
          as: 'contracts',
          where: { status: 'active' },
          required: false
        }
      ]
    });

    if (!property) {
      return next(new AppError('Propiedad no encontrada', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Verificar propietario
    if (property.user_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre esta propiedad', 403, 'FORBIDDEN'));
    }

    // Verificar que no tenga contratos activos
    if (property.contracts && property.contracts.length > 0) {
      return next(new AppError('No se puede eliminar la propiedad porque tiene contratos activos', 400, 'HAS_ACTIVE_CONTRACTS'));
    }

    await property.destroy();

    logger.info(`Propiedad eliminada: ${req.params.id} por usuario ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Propiedad eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene estadísticas de propiedades
 * GET /api/properties/stats
 */
exports.getPropertyStats = async (req, res, next) => {
  try {
    const where = { user_id: req.user.id };

    const total = await Property.count({ where });
    const available = await Property.count({ where: { ...where, status: 'available' } });
    const rented = await Property.count({ where: { ...where, status: 'rented' } });
    const maintenance = await Property.count({ where: { ...where, status: 'maintenance' } });

    // Rentabilidad total
    const properties = await Property.findAll({
      where,
      attributes: ['monthly_rent', 'status']
    });

    const totalMonthlyRent = properties
      .filter(p => p.status === 'rented')
      .reduce((sum, p) => sum + parseFloat(p.monthly_rent || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total,
          available,
          rented,
          maintenance,
          totalMonthlyRent
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
