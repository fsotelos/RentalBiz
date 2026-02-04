/**
 * Controlador de Contratos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Contract, Property, User, Payment, Notification } = require('../models');
const { Op, fn, col } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Obtiene todos los contratos
 * GET /api/contracts
 */
exports.getAllContracts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      property_id,
      type, // landlord o tenant
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    // Filtrar por rol del usuario
    if (type === 'landlord' || req.user.role === 'landlord') {
      where.landlord_id = req.user.id;
    } else if (type === 'tenant') {
      where.tenant_id = req.user.id;
    } else {
      // Si no especifica, mostrar todos los que le pertenecen
      where[Op.or] = [
        { landlord_id: req.user.id },
        { tenant_id: req.user.id }
      ];
    }

    if (status) where.status = status;
    if (property_id) where.property_id = property_id;

    if (search) {
      where[Op.or] = [
        ...(where[Op.or] || []),
        { contract_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sort_by, sort_order.toUpperCase()]];

    const { count, rows: contracts } = await Contract.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address', 'city', 'type', 'monthly_rent']
        },
        {
          model: User,
          as: 'landlord',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'tenant',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset,
      order,
      distinct: true
    });

    res.status(200).json({
      success: true,
      data: {
        contracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un contrato por ID
 * GET /api/contracts/:id
 */
exports.getContractById = async (req, res, next) => {
  try {
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: User,
          as: 'landlord',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'tenant',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Payment,
          as: 'payments',
          order: [['due_date', 'DESC']],
          limit: 12
        }
      ]
    });

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    // Verificar permisos
    const hasAccess = contract.landlord_id === req.user.id || 
                      contract.tenant_id === req.user.id ||
                      req.user.role === 'landlord';
    
    if (!hasAccess) {
      return next(new AppError('No tienes acceso a este contrato', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: { contract }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo contrato
 * POST /api/contracts
 */
exports.createContract = async (req, res, next) => {
  try {
    const {
      property_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      security_deposit,
      payment_frequency,
      payment_day,
      late_payment_penalty,
      terms_conditions,
      special_conditions
    } = req.body;

    // Verificar propiedad
    const property = await Property.findByPk(property_id);
    if (!property) {
      return next(new AppError('Propiedad no encontrada', 404, 'PROPERTY_NOT_FOUND'));
    }

    // Verificar que el usuario sea el propietario
    if (property.user_id !== req.user.id) {
      return next(new AppError('No eres propietario de esta propiedad', 403, 'FORBIDDEN'));
    }

    // Verificar inquilino
    const tenant = await User.findByPk(tenant_id);
    if (!tenant) {
      return next(new AppError('Inquilino no encontrado', 404, 'TENANT_NOT_FOUND'));
    }

    // Verificar que la propiedad no tenga otro contrato activo
    const existingContract = await Contract.findOne({
      where: {
        property_id,
        status: 'active'
      }
    });

    if (existingContract) {
      return next(new AppError('La propiedad ya tiene un contrato activo', 400, 'PROPERTY_HAS_ACTIVE_CONTRACT'));
    }

    // Generar número de contrato único
    const contractCount = await Contract.count();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const contract_number = `CTR-${date}-${String(contractCount + 1).padStart(5, '0')}-${random}`;

    // Crear contrato
    const contract = await Contract.create({
      contract_number,
      property_id,
      landlord_id: req.user.id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      security_deposit,
      payment_frequency: payment_frequency || 'monthly',
      payment_day: payment_day || 1,
      late_payment_penalty,
      terms_conditions,
      special_conditions,
      status: 'active'
    });

    // Actualizar estado de la propiedad
    await property.update({ status: 'rented' });

    // Crear notificación para el inquilino
    await Notification.create({
      user_id: tenant_id,
      contract_id: contract.id,
      type: 'contract_activated',
      subject: 'Contrato de arrendamiento activado',
      message: `Tu contrato para ${property.name} ha sido activado. Inicio: ${start_date}, Fin: ${end_date}`,
      priority: 'high',
      action_url: `/contracts/${contract.id}`
    });

    logger.info(`Contrato creado: ${contract.contract_number} por usuario ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Contrato creado exitosamente',
      data: { contract }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un contrato
 * PUT /api/contracts/:id
 */
exports.updateContract = async (req, res, next) => {
  try {
    const contract = await Contract.findByPk(req.params.id);

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    // Verificar permisos
    if (contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
    }

    // No permitir cambios si está expirado o terminado
    if (['expired', 'terminated'].includes(contract.status)) {
      return next(new AppError('No se puede modificar un contrato expirado o terminado', 400, 'CONTRACT_NOT_MODIFIABLE'));
    }

    await contract.update(req.body);

    logger.info(`Contrato actualizado: ${contract.contract_number} por usuario ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Contrato actualizado exitosamente',
      data: { contract }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambia estado de contrato
 * PUT /api/contracts/:id/status
 */
exports.updateContractStatus = async (req, res, next) => {
  try {
    const { status, termination_reason } = req.body;
    const contract = await Contract.findByPk(req.params.id, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    // Verificar permisos
    if (contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
    }

    // Actualizar estado
    const updateData = { status };
    
    if (status === 'terminated') {
      updateData.termination_date = new Date();
      updateData.termination_reason = termination_reason;
      
      // Liberar propiedad
      await contract.property.update({ status: 'available' });
      
      // Notificar al inquilino
      await Notification.create({
        user_id: contract.tenant_id,
        contract_id: contract.id,
        type: 'contract_terminated',
        subject: 'Contrato terminado',
        message: `Tu contrato ha sido terminado. Razón: ${termination_reason}`,
        priority: 'high'
      });
    }

    await contract.update(updateData);

    logger.info(`Estado de contrato actualizado: ${contract.contract_number} a ${status}`);

    res.status(200).json({
      success: true,
      message: 'Estado de contrato actualizado exitosamente',
      data: { contract }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Termina contrato y genera pago de depósito si aplica
 * POST /api/contracts/:id/terminate
 */
exports.terminateContract = async (req, res, next) => {
  try {
    const { termination_reason, return_deposit } = req.body;
    
    const contract = await Contract.findByPk(req.params.id, {
      include: [
        { model: Property, as: 'property' },
        { model: User, as: 'tenant' }
      ]
    });

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    // Verificar permisos
    if (contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
    }

    // Terminar contrato
    await contract.update({
      status: 'terminated',
      termination_date: new Date(),
      termination_reason
    });

    // Liberar propiedad
    await contract.property.update({ status: 'available' });

    // Si hay depósito y se devuelve, crear pago de devolución
    if (return_deposit && contract.security_deposit > 0) {
      await Payment.create({
        contract_id: contract.id,
        user_id: contract.tenant_id,
        type: 'deposit',
        amount: contract.security_deposit,
        due_date: new Date(),
        payment_date: new Date(),
        status: 'paid',
        payment_method: 'other',
        notes: `Devolución de depósito del contrato ${contract.contract_number}`
      });
    }

    // Notificar
    await Notification.create({
      user_id: contract.tenant_id,
      contract_id: contract.id,
      type: 'contract_terminated',
      subject: 'Contrato terminado',
      message: `Tu contrato para ${contract.property.name} ha sido terminado.${return_deposit ? ' El depósito será devuelto.' : ''}`,
      priority: 'high'
    });

    logger.info(`Contrato terminado: ${contract.contract_number}`);

    res.status(200).json({
      success: true,
      message: 'Contrato terminado exitosamente',
      data: { contract }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene contratos próximos a vencer
 * GET /api/contracts/expiring
 */
exports.getExpiringContracts = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const contracts = await Contract.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [new Date(), expiryDate]
        }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address']
        },
        {
          model: User,
          as: 'tenant',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['end_date', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        contracts,
        count: contracts.length
      }
    });
  } catch (error) {
    next(error);
  }
};
