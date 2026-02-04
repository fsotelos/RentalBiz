/**
 * Controlador de Notificaciones
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Notification, User, Payment, Contract, Property } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { sendPaymentReminder, sendPaymentOverdue } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Obtiene todas las notificaciones del usuario
 * GET /api/notifications
 */
exports.getAllNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, unread_only, type } = req.query;

    const where = { user_id: req.user.id };

    if (unread_only === 'true') {
      where.is_read = false;
    }

    if (type) {
      where.type = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Contar no leídas
    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
 * Obtiene una notificación por ID
 * GET /api/notifications/:id
 */
exports.getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id, {
      include: [
        {
          model: Payment,
          as: 'payment'
        },
        {
          model: Contract,
          as: 'contract'
        }
      ]
    });

    if (!notification) {
      return next(new AppError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND'));
    }

    // Verificar que pertenezca al usuario
    if (notification.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a esta notificación', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marca una notificación como leída
 * PUT /api/notifications/:id/read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return next(new AppError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND'));
    }

    if (notification.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a esta notificación', 403, 'FORBIDDEN'));
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marca todas las notificaciones como leídas
 * PUT /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina una notificación
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return next(new AppError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND'));
    }

    if (notification.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a esta notificación', 403, 'FORBIDDEN'));
    }

    await notification.destroy();

    res.status(200).json({
      success: true,
      message: 'Notificación eliminada'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene preferencias de notificación del usuario
 * GET /api/notifications/settings
 */
exports.getNotificationSettings = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        preferences: req.user.notification_preferences || {}
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza preferencias de notificación
 * PUT /api/notifications/settings
 */
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { email, payment_reminder_days, contract_expiry_days } = req.body;

    const preferences = {
      ...req.user.notification_preferences,
      email: email !== undefined ? email : true,
      payment_reminder_days: payment_reminder_days || 5,
      contract_expiry_days: contract_expiry_days || 30
    };

    await req.user.update({ notification_preferences: preferences });

    res.status(200).json({
      success: true,
      message: 'Preferencias actualizadas',
      data: { preferences }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Envía recordatorios de pago manualmente
 * POST /api/notifications/send-reminders
 */
exports.sendPaymentReminders = async (req, res, next) => {
  try {
    const { days = 5 } = req.body;

    // Buscar pagos pendientes que vencen en los próximos días
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const pendingPayments = await Payment.findAll({
      where: {
        status: 'pending',
        due_date: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name', 'notification_preferences']
        },
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: User,
              as: 'landlord',
              attributes: ['id', 'email', 'first_name', 'last_name']
            },
            {
              model: Property,
              as: 'property'
            }
          ]
        }
      ]
    });

    let sentCount = 0;
    const errors = [];

    for (const payment of pendingPayments) {
      try {
        // Verificar preferencias del usuario
        const prefDays = payment.user.notification_preferences?.payment_reminder_days || 5;
        const daysUntilDue = Math.ceil((new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= prefDays) {
          // Enviar email
          await sendPaymentReminder(payment, payment.user);
          
          // Marcar como enviado
          await payment.update({ reminder_sent: true, reminder_date: new Date() });

          // Crear notificación en sistema
          await Notification.create({
            user_id: payment.user_id,
            payment_id: payment.id,
            type: 'payment_reminder',
            subject: 'Recordatorio de pago',
            message: `Tu pago de $${payment.amount} para ${payment.contract.property.name} vence el ${payment.due_date}`,
            priority: daysUntilDue <= 2 ? 'high' : 'medium',
            action_url: `/payments/${payment.id}`
          });

          sentCount++;
        }
      } catch (err) {
        errors.push({ payment_id: payment.id, error: err.message });
      }
    }

    logger.info(`Enviados ${sentCount} recordatorios de pago`);

    res.status(200).json({
      success: true,
      message: `Enviados ${sentCount} recordatorios`,
      data: {
        sentCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene notificaciones del sistema (dashboard)
 * GET /api/notifications/dashboard
 */
exports.getDashboardNotifications = async (req, res, next) => {
  try {
    // Pagos próximos a vencer (próximos 7 días)
    const upcomingPayments = await Payment.findAll({
      where: {
        user_id: req.user.id,
        status: 'pending',
        due_date: {
          [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        }
      },
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [{ model: Property, as: 'property' }]
        }
      ],
      order: [['due_date', 'ASC']],
      limit: 5
    });

    // Pagos vencidos
    const overduePayments = await Payment.count({
      where: {
        user_id: req.user.id,
        status: 'overdue'
      }
    });

    // Notificaciones no leídas
    const unreadNotifications = await Notification.findAll({
      where: {
        user_id: req.user.id,
        is_read: false
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Contratos por vencer (solo para arrendadores)
    let expiringContracts = [];
    if (req.user.role === 'landlord') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      expiringContracts = await Contract.findAll({
        where: {
          landlord_id: req.user.id,
          status: 'active',
          end_date: {
            [Op.between]: [new Date(), futureDate]
          }
        },
        include: [
          {
            model: Property,
            as: 'property'
          }
        ],
        order: [['end_date', 'ASC']],
        limit: 5
      });
    }

    res.status(200).json({
      success: true,
      data: {
        upcomingPayments,
        overduePayments,
        unreadNotifications,
        expiringContracts,
        stats: {
          totalUnread: unreadNotifications.length,
          overdueCount: overduePayments
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
