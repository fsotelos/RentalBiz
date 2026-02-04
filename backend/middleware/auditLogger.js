/**
 * Audit Logger Middleware
 * Automatically logs payment-related actions to audit trail
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { AuditLog } = require('../models');

/**
 * Creates an audit log entry
 */
const createAuditLog = async (options) => {
  try {
    await AuditLog.log(options);
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

/**
 * Middleware factory to audit specific actions
 */
const auditPaymentAction = (action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = async (data) => {
      // Only log if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || req.body?.payment_id;
        
        if (entityId) {
          await createAuditLog({
            entityType: 'payment',
            entityId,
            action,
            userId: req.user?.id,
            oldValues: req.body?.oldValues || null,
            newValues: req.body,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            metadata: {
              path: req.path,
              method: req.method,
              statusCode: res.statusCode
            }
          });
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Log payment submission
 */
const logPaymentSubmission = async (req, payment) => {
  await createAuditLog({
    entityType: 'payment',
    entityId: payment.id,
    action: 'submitted_for_approval',
    userId: req.user.id,
    oldValues: { status: 'pending' },
    newValues: { 
      status: 'pending_approval',
      submitted_at: payment.submitted_at,
      amount: payment.amount,
      type: payment.type
    },
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      contract_id: payment.contract_id,
      due_date: payment.due_date
    }
  });
};

/**
 * Log payment approval
 */
const logPaymentApproval = async (req, payment, approver) => {
  await createAuditLog({
    entityType: 'payment',
    entityId: payment.id,
    action: 'approved',
    userId: approver.id,
    oldValues: { 
      status: payment.status,
      requires_approval: payment.requires_approval
    },
    newValues: { 
      status: 'approved',
      approved_at: new Date(),
      approved_by: approver.id
    },
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      contract_id: payment.contract_id,
      amount: payment.amount,
      approver_role: approver.role
    }
  });
};

/**
 * Log payment rejection
 */
const logPaymentRejection = async (req, payment, approver, reason) => {
  await createAuditLog({
    entityType: 'payment',
    entityId: payment.id,
    action: 'rejected',
    userId: approver.id,
    oldValues: { 
      status: payment.status 
    },
    newValues: { 
      status: 'rejected',
      rejected_at: new Date(),
      rejected_by: approver.id,
      rejection_reason: reason
    },
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      contract_id: payment.contract_id,
      amount: payment.amount,
      approver_role: approver.role
    }
  });
};

/**
 * Log payment status update
 */
const logPaymentUpdate = async (req, payment, oldValues, newValues) => {
  await createAuditLog({
    entityType: 'payment',
    entityId: payment.id,
    action: 'updated',
    userId: req.user.id,
    oldValues,
    newValues,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      contract_id: payment.contract_id,
      updated_fields: Object.keys(newValues)
    }
  });
};

/**
 * Log payment deletion/cancellation
 */
const logPaymentCancellation = async (req, payment, reason) => {
  await createAuditLog({
    entityType: 'payment',
    entityId: payment.id,
    action: 'cancelled',
    userId: req.user.id,
    oldValues: { 
      status: payment.status,
      amount: payment.amount 
    },
    newValues: { 
      status: 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason
    },
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    metadata: {
      contract_id: payment.contract_id,
      cancelled_by_role: req.user.role
    }
  });
};

module.exports = {
  createAuditLog,
  auditPaymentAction,
  logPaymentSubmission,
  logPaymentApproval,
  logPaymentRejection,
  logPaymentUpdate,
  logPaymentCancellation
};
