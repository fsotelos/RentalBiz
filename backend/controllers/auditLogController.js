/**
 * Audit Log Controller
 * Provides audit log viewing and export functionality
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { AuditLog, User } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Get all audit logs with filtering
 * GET /api/audit-logs
 */
exports.getAllAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      entity_type,
      entity_id,
      action,
      user_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    // Filter by entity type
    if (entity_type) {
      where.entity_type = entity_type;
    }

    // Filter by entity ID
    if (entity_id) {
      where.entity_id = entity_id;
    }

    // Filter by action
    if (action) {
      where.action = action;
    }

    // Filter by user
    if (user_id) {
      where.user_id = user_id;
    }

    // Date range filter
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    // Landlords can only see logs for their properties/contracts
    if (req.user.role === 'landlord') {
      // Get contracts for this landlord
      const { Contract, Payment } = require('../models');
      
      const contracts = await Contract.findAll({
        where: { landlord_id: req.user.id },
        attributes: ['id']
      });
      const contractIds = contracts.map(c => c.id);

      // Get payments for these contracts
      const payments = await Payment.findAll({
        where: { contract_id: { [Op.in]: contractIds } },
        attributes: ['id']
      });
      const paymentIds = payments.map(p => p.id);

      // Filter by payments belonging to landlord
      where[Op.or] = [
        { entity_type: 'payment', entity_id: { [Op.in]: paymentIds } },
        { entity_type: 'contract', entity_id: { [Op.in]: contractIds } },
        { user_id: req.user.id }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sort_by, sort_order.toUpperCase()]];

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
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
        logs,
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
 * Get audit logs for a specific payment
 * GET /api/audit-logs/payment/:paymentId
 */
exports.getPaymentAuditLogs = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    // Get the payment first to verify access
    const { Payment, Contract } = require('../models');
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Contract,
          as: 'contract'
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verify access
    const hasAccess = 
      payment.user_id === req.user.id || 
      req.user.role === 'landlord' ||
      (req.user.role === 'landlord' && payment.contract?.landlord_id === req.user.id);

    if (!hasAccess) {
      return next(new AppError('No tienes acceso a estos registros', 403, 'FORBIDDEN'));
    }

    const logs = await AuditLog.findAll({
      where: {
        entity_type: 'payment',
        entity_id: paymentId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Group logs by action type for summary
    const actionSummary = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary: {
          total: logs.length,
          byAction: actionSummary
        },
        payment: {
          id: payment.id,
          reference_number: payment.reference_number,
          amount: payment.amount,
          status: payment.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit logs for a specific contract
 * GET /api/audit-logs/contract/:contractId
 */
exports.getContractAuditLogs = async (req, res, next) => {
  try {
    const { contractId } = req.params;

    // Verify access
    const { Contract } = require('../models');
    
    const contract = await Contract.findByPk(contractId);

    if (!contract) {
      return next(new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND'));
    }

    const hasAccess = 
      contract.landlord_id === req.user.id || 
      contract.tenant_id === req.user.id ||
      req.user.role === 'landlord';

    if (!hasAccess) {
      return next(new AppError('No tienes acceso a estos registros', 403, 'FORBIDDEN'));
    }

    const logs = await AuditLog.findAll({
      where: {
        entity_type: 'contract',
        entity_id: contractId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        summary: {
          total: logs.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
exports.getAuditStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {
      created_at: {}
    };

    if (start_date) where.created_at[Op.gte] = new Date(start_date);
    if (end_date) where.created_at[Op.lte] = new Date(end_date);

    // Get action counts
    const actionCounts = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Get daily activity for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActivity = await AuditLog.findAll({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [['date', 'ASC']],
      raw: true
    });

    // Get top users by activity
    const topUsers = await AuditLog.findAll({
      where,
      attributes: [
        'user_id',
        [fn('COUNT', col('id')), 'count']
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      group: ['user_id', 'user.id', 'user.first_name', 'user.last_name', 'user.email'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: false
    });

    res.status(200).json({
      success: true,
      data: {
        actionCounts: actionCounts.reduce((acc, item) => {
          acc[item.action] = parseInt(item.count);
          return acc;
        }, {}),
        dailyActivity,
        topUsers: topUsers.map(u => ({
          user_id: u.user_id,
          name: `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim(),
          email: u.user?.email,
          count: parseInt(u.get('count'))
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs
 * GET /api/audit-logs/export
 */
exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { entity_type, entity_id, start_date, end_date, format = 'json' } = req.query;

    const where = {};

    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const logs = await AuditLog.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'ASC']],
      raw: false
    });

    // Format for export
    const exportData = logs.map(log => ({
      fecha: log.created_at,
      tipo_entidad: log.entity_type,
      id_entidad: log.entity_id,
      accion: log.action,
      usuario: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'N/A',
      valores_anteriores: JSON.stringify(log.old_values || {}),
      valores_nuevos: JSON.stringify(log.new_values || {}),
      direccion_ip: log.ip_address
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
      return res.send(csv);
    }

    // Default to JSON
    res.status(200).json({
      success: true,
      data: exportData,
      meta: {
        exported_at: new Date(),
        total_records: exportData.length,
        filters: { entity_type, entity_id, start_date, end_date }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single audit log entry
 * GET /api/audit-logs/:id
 */
exports.getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ]
    });

    if (!log) {
      return next(new AppError('Registro de auditoría no encontrado', 404, 'AUDIT_LOG_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: { log }
    });
  } catch (error) {
    next(error);
  }
};
