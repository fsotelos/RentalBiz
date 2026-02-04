/**
 * Servicio de Notificaciones Automatizadas
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Payment, Contract, User, Notification } = require('../models');
const { Op, fn, col } = require('sequelize');
const { sendPaymentReminder, sendPaymentOverdue, sendContractExpiring } = require('./emailService');
const logger = require('../utils/logger');

/**
 * Envía recordatorios de pagos próximos a vencer
 */
const sendPaymentReminders = async () => {
  try {
    logger.info('Iniciando envío de recordatorios de pagos...');

    // Obtener preferencia de días de la configuración global (usar 5 como default)
    const reminderDays = parseInt(process.env.PAYMENT_REMINDER_DAYS) || 5;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + reminderDays);

    const pendingPayments = await Payment.findAll({
      where: {
        status: 'pending',
        due_date: {
          [Op.between]: [new Date(), futureDate]
        },
        reminder_sent: false
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
              model: User,
              as: 'tenant',
              attributes: ['id', 'email', 'first_name', 'last_name']
            },
            {
              model: require('../models').Property,
              as: 'property'
            }
          ]
        }
      ]
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const payment of pendingPayments) {
      try {
        const user = payment.user;
        const prefDays = user.notification_preferences?.payment_reminder_days || reminderDays;
        
        // Solo enviar si está dentro de las preferencias del usuario
        const daysUntilDue = Math.ceil((new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= prefDays) {
          // Enviar email
          await sendPaymentReminder(payment, user);
          
          // Crear notificación en sistema
          await Notification.create({
            user_id: user.id,
            payment_id: payment.id,
            type: 'payment_reminder',
            subject: 'Recordatorio de pago',
            message: `Tu pago de ${payment.type} para ${payment.contract.property.name} vence el ${payment.due_date}`,
            priority: daysUntilDue <= 2 ? 'high' : 'medium',
            action_url: `/payments/${payment.id}`
          });

          // Marcar como enviado
          await payment.update({ reminder_sent: true, reminder_date: new Date() });
          
          sentCount++;
          logger.info(`Recordatorio enviado para pago ${payment.reference_number}`);
        }
      } catch (error) {
        failedCount++;
        logger.error(`Error enviando recordatorio para pago ${payment.reference_number}:`, error);
      }
    }

    logger.info(`Envío de recordatorios completado. Enviados: ${sentCount}, Fallidos: ${failedCount}`);
    return { sentCount, failedCount };
  } catch (error) {
    logger.error('Error en sendPaymentReminders:', error);
    throw error;
  }
};

/**
 * Procesa pagos vencidos
 */
const processOverduePayments = async () => {
  try {
    logger.info('Procesando pagos vencidos...');

    // Marcar pagos vencidos
    await Payment.update(
      { status: 'overdue' },
      {
        where: {
          status: 'pending',
          due_date: { [Op.lt]: new Date() }
        }
      }
    );

    // Obtener pagos vencidos para enviar notificaciones
    const overduePayments = await Payment.findAll({
      where: {
        status: 'overdue'
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
              model: require('../models').Property,
              as: 'property'
            }
          ]
        }
      ]
    });

    let sentCount = 0;

    for (const payment of overduePayments) {
      try {
        // Verificar que no se haya enviado notificación recientemente (hace más de 3 días)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const recentNotification = await Notification.findOne({
          where: {
            payment_id: payment.id,
            type: 'payment_overdue',
            created_at: { [Op.gt]: threeDaysAgo }
          }
        });

        if (!recentNotification) {
          // Enviar email
          await sendPaymentOverdue(payment, payment.user);

          // Crear notificación
          await Notification.create({
            user_id: payment.user_id,
            payment_id: payment.id,
            type: 'payment_overdue',
            subject: 'Pago vencido',
            message: `Tu pago de ${payment.type} para ${payment.contract.property.name} está vencido`,
            priority: 'high',
            action_url: `/payments/${payment.id}`
          });

          sentCount++;
        }
      } catch (error) {
        logger.error(`Error procesando pago vencido ${payment.reference_number}:`, error);
      }
    }

    logger.info(`Procesamiento de pagos vencidos completado. Notificaciones enviadas: ${sentCount}`);
    return { processed: overduePayments.length, sentCount };
  } catch (error) {
    logger.error('Error en processOverduePayments:', error);
    throw error;
  }
};

/**
 * Procesa contratos próximos a vencer
 */
const processExpiringContracts = async () => {
  try {
    logger.info('Procesando contratos por vencer...');

    const expiryDays = parseInt(process.env.CONTRACT_EXPIRY_DAYS) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + expiryDays);

    const expiringContracts = await Contract.findAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [new Date(), futureDate]
        },
        renewal_notice_sent: false
      },
      include: [
        {
          model: User,
          as: 'landlord',
          attributes: ['id', 'email', 'first_name', 'last_name', 'notification_preferences']
        },
        {
          model: User,
          as: 'tenant',
          attributes: ['id', 'email', 'first_name', 'last_name', 'notification_preferences']
        },
        {
          model: require('../models').Property,
          as: 'property'
        }
      ]
    });

    let sentCount = 0;

    for (const contract of expiringContracts) {
      try {
        // Notificar al inquilino
        await sendContractExpiring(contract, contract.tenant);
        
        await Notification.create({
          user_id: contract.tenant_id,
          contract_id: contract.id,
          type: 'contract_expiring',
          subject: 'Tu contrato está por vencer',
          message: `Tu contrato para ${contract.property.name} vence el ${contract.end_date}`,
          priority: 'high',
          action_url: `/contracts/${contract.id}`
        });

        // Notificar al arrendador
        await Notification.create({
          user_id: contract.landlord_id,
          contract_id: contract.id,
          type: 'contract_expiring',
          subject: 'Contrato por vencer',
          message: `El contrato para ${contract.property.name} vence el ${contract.end_date}`,
          priority: 'medium',
          action_url: `/contracts/${contract.id}`
        });

        // Marcar como notificado
        await contract.update({ renewal_notice_sent: true });
        
        sentCount++;
      } catch (error) {
        logger.error(`Error procesando contrato ${contract.contract_number}:`, error);
      }
    }

    logger.info(`Procesamiento de contratos completado. Notificaciones enviadas: ${sentCount}`);
    return { processed: expiringContracts.length, sentCount };
  } catch (error) {
    logger.error('Error en processExpiringContracts:', error);
    throw error;
  }
};

/**
 * Ejecuta todas las tareas de notificación programadas
 */
const runAllScheduledTasks = async () => {
  try {
    logger.info('Ejecutando tareas programadas de notificación...');
    
    const results = {
      paymentReminders: await sendPaymentReminders(),
      overduePayments: await processOverduePayments(),
      expiringContracts: await processExpiringContracts()
    };

    logger.info('Tareas programadas completadas:', results);
    return results;
  } catch (error) {
    logger.error('Error en tareas programadas:', error);
    throw error;
  }
};

module.exports = {
  sendPaymentReminders,
  processOverduePayments,
  processExpiringContracts,
  runAllScheduledTasks
};
