/**
 * Controlador de Pagos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Payment, Contract, Property, User, Notification } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Obtiene todos los pagos
 * GET /api/payments
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      contract_id,
      start_date,
      end_date,
      sort_by = 'due_date',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    // Filtrar por rol
    if (req.user.role === 'landlord') {
      // Arrendador ve todos los pagos de sus propiedades
      const contracts = await Contract.findAll({
        where: { landlord_id: req.user.id },
        attributes: ['id']
      });
      const contractIds = contracts.map(c => c.id);
      where.contract_id = { [Op.in]: contractIds };
    } else {
      // Arrendatario ve solo sus pagos
      where.user_id = req.user.id;
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (contract_id) where.contract_id = contract_id;

    if (start_date || end_date) {
      where.due_date = {};
      if (start_date) where.due_date[Op.gte] = start_date;
      if (end_date) where.due_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sort_by, sort_order.toUpperCase()]];

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Contract,
          as: 'contract',
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
          ]
        },
        {
          model: User,
          as: 'user',
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
        payments,
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
 * Obtiene un pago por ID
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: Property,
              as: 'property'
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verificar permisos
    const hasAccess = payment.user_id === req.user.id || 
                      req.user.role === 'landlord';
    
    if (!hasAccess) {
      return next(new AppError('No tienes acceso a este pago', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo pago
 * POST /api/payments
 */
exports.createPayment = async (req, res, next) => {
  try {
    const {
      contract_id,
      type,
      amount,
      due_date,
      payment_method,
      notes
    } = req.body;

    // Verificar contrato
    const contract = await Contract.findByPk(contract_id, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    // Verificar permisos - landlord puede crear pagos para sus contratos
    if (req.user.role === 'landlord') {
      if (contract.landlord_id !== req.user.id) {
        return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
      }
    } else if (req.user.role === 'tenant') {
      if (contract.tenant_id !== req.user.id) {
        return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
      }
    }

    // Crear pago - si el landlord crea el pago, asignar al tenant del contrato
    const payment = await Payment.create({
      contract_id,
      user_id: req.user.role === 'landlord' ? contract.tenant_id : req.user.id,
      type,
      amount,
      due_date,
      payment_method,
      notes,
      status: 'pending'
    });

    logger.info(`Pago creado: ${payment.reference_number} por usuario ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra un pago como pagado
 * PUT /api/payments/:id/pay
 */
exports.markAsPaid = async (req, res, next) => {
  try {
    const { payment_date, payment_method, reference_number, bank_reference, notes } = req.body;

    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [{ model: Property, as: 'property' }]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verificar permisos - landlord puede marcar como pagado los pagos de sus contratos
    if (req.user.role === 'landlord') {
      if (payment.contract.landlord_id !== req.user.id) {
        return next(new AppError('No tienes acceso a este pago', 403, 'FORBIDDEN'));
      }
    } else if (payment.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a este pago', 403, 'FORBIDDEN'));
    }

    // Actualizar pago (sin modificar reference_number)
    await payment.update({
      payment_date: payment_date || new Date(),
      payment_method,
      bank_reference,
      notes,
      status: 'paid'
    });

    // Crear notificación para el arrendador
    if (req.user.role === 'tenant') {
      const contract = await Contract.findByPk(payment.contract_id);
      await Notification.create({
        user_id: contract.landlord_id,
        payment_id: payment.id,
        type: 'payment_received',
        subject: 'Pago recibido',
        message: `Se ha registrado un pago de $${payment.amount} para ${contract.property.name}`,
        priority: 'medium'
      });
    }

    logger.info(`Pago marcado como pagado: ${payment.reference_number}`);

    res.status(200).json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un pago
 * PUT /api/payments/:id
 */
exports.updatePayment = async (req, res, next) => {
  try {
    const { amount, due_date, payment_method, reference_number, bank_reference, notes, status } = req.body;

    const payment = await Payment.findByPk(req.params.id, {
      include: [{
        model: Contract,
        as: 'contract'
      }]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verificar permisos (solo el arrendador del contrato puede actualizar)
    if (req.user.role !== 'landlord') {
      return next(new AppError('No tienes permisos para actualizar pagos', 403, 'FORBIDDEN'));
    }

    if (payment.contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este pago', 403, 'FORBIDDEN'));
    }

    // Actualizar pago (reference_number no se puede modificar)
    await payment.update({
      amount,
      due_date,
      payment_method,
      bank_reference,
      notes,
      status
    });

    res.status(200).json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene pagos pendientes
 * GET /api/payments/pending
 */
exports.getPendingPayments = async (req, res, next) => {
  try {
    const where = {
      status: 'pending'
    };

    if (req.user.role === 'landlord') {
      const contracts = await Contract.findAll({
        where: { landlord_id: req.user.id },
        attributes: ['id']
      });
      const contractIds = contracts.map(c => c.id);
      where.contract_id = { [Op.in]: contractIds };
    } else {
      where.user_id = req.user.id;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'name', 'address']
            }
          ]
        }
      ],
      order: [['due_date', 'ASC']]
    });

    // Calcular total y contar vencidos
    const now = new Date();
    let totalAmount = 0;
    let overdueCount = 0;

    payments.forEach(p => {
      totalAmount += parseFloat(p.amount);
      if (new Date(p.due_date) < now) {
        overdueCount++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          total: payments.length,
          totalAmount,
          overdueCount,
          pendingAmount: totalAmount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un pago
 * DELETE /api/payments/:id
 */
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [{
        model: Contract,
        as: 'contract'
      }]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Solo el landlord puede eliminar pagos y solo de sus contratos
    if (req.user.role !== 'landlord') {
      return next(new AppError('No tienes permisos para eliminar pagos', 403, 'FORBIDDEN'));
    }

    if (payment.contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este pago', 403, 'FORBIDDEN'));
    }

    // Eliminar el pago
    await payment.destroy();

    logger.info(`Pago eliminado: ${payment.reference_number} por usuario ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene pagos vencidos
 * GET /api/payments/overdue
 */
exports.getOverduePayments = async (req, res, next) => {
  try {
    const where = {
      status: 'overdue'
    };

    if (req.user.role === 'landlord') {
      const contracts = await Contract.findAll({
        where: { landlord_id: req.user.id },
        attributes: ['id']
      });
      const contractIds = contracts.map(c => c.id);
      where.contract_id = { [Op.in]: contractIds };
    } else {
      where.user_id = req.user.id;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'name', 'address']
            }
          ]
        }
      ],
      order: [['due_date', 'ASC']]
    });

    // Calcular total de deuda
    const totalDebt = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          count: payments.length,
          totalDebt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene resumen de pagos
 * GET /api/payments/summary
 */
exports.getPaymentSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    // Construir where base según rol
    let contractWhere = {};
    if (req.user.role === 'landlord') {
      contractWhere = { landlord_id: req.user.id };
    }

    const contracts = await Contract.findAll({
      where: contractWhere,
      attributes: ['id']
    });
    const contractIds = contracts.map(c => c.id);

    // Pagos del mes
    const monthlyPayments = await Payment.findAll({
      where: {
        contract_id: { [Op.in]: contractIds },
        due_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Calcular estadísticas
    let totalExpected = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    monthlyPayments.forEach(p => {
      const amount = parseFloat(p.amount);
      totalExpected += amount;
      
      switch (p.status) {
        case 'paid':
          totalPaid += amount;
          break;
        case 'pending':
          if (new Date(p.due_date) < new Date()) {
            totalOverdue += amount;
          } else {
            totalPending += amount;
          }
          break;
        case 'overdue':
          totalOverdue += amount;
          break;
      }
    });

    // Pagos por tipo
    const paymentsByType = await Payment.findAll({
      where: {
        contract_id: { [Op.in]: contractIds },
        due_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'type',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          month: targetMonth,
          year: targetYear,
          totalExpected,
          totalPaid,
          totalPending,
          totalOverdue,
          collectionRate: totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(2) : 0
        },
        paymentsByType: paymentsByType.map(p => ({
          type: p.type,
          total: parseFloat(p.total) || 0,
          count: parseInt(p.count)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Genera pagos recurrentes para un contrato
 * POST /api/payments/generate-recurring
 */
exports.generateRecurringPayments = async (req, res, next) => {
  try {
    const { contract_id, months = 1 } = req.body;

    const contract = await Contract.findByPk(contract_id, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    if (contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este contrato', 403, 'FORBIDDEN'));
    }

    if (contract.status !== 'active') {
      return next(new AppError('El contrato no está activo', 400, 'CONTRACT_NOT_ACTIVE'));
    }

    const payments = [];
    const now = new Date();
    let currentDate = new Date(contract.start_date);

    // Generar pagos según frecuencia
    for (let i = 0; i < months; i++) {
      currentDate.setMonth(currentDate.getMonth() + i);
      
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), contract.payment_day);
      
      if (dueDate > new Date(contract.end_date)) break;

      // Verificar si ya existe pago para esta fecha
      const existingPayment = await Payment.findOne({
        where: {
          contract_id: contract.id,
          type: 'rent',
          due_date: dueDate
        }
      });

      if (!existingPayment) {
        const payment = await Payment.create({
          contract_id: contract.id,
          user_id: contract.tenant_id,
          type: 'rent',
          amount: contract.monthly_rent,
          due_date: dueDate,
          status: dueDate < now ? 'overdue' : 'pending',
          is_automatic: true
        });
        payments.push(payment);
      }
    }

    logger.info(`Generados ${payments.length} pagos automáticos para contrato ${contract.contract_number}`);

    res.status(201).json({
      success: true,
      message: `Se generaron ${payments.length} pagos`,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};
