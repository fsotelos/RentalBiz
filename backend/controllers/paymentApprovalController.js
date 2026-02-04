/**
 * Payment Approval Controller
 * Handles payment submission and approval workflow
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Payment, PaymentApproval, Contract, User, Notification, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { logPaymentSubmission, logPaymentApproval, logPaymentRejection } = require('../middleware/auditLogger');

/**
 * Submit a payment for approval
 * POST /api/payments/:id/submit
 */
exports.submitForApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_method, reference_number, bank_reference, notes } = req.body;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            { model: User, as: 'landlord' },
            { model: User, as: 'tenant' }
          ]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verify permissions - only tenant who created the payment can submit
    if (payment.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a este pago', 403, 'FORBIDDEN'));
    }

    // Check if already submitted
    if (payment.status === 'pending_approval' || payment.status === 'approved') {
      return next(new AppError('Este pago ya ha sido enviado para aprobación', 400, 'ALREADY_SUBMITTED'));
    }

    // Update payment with submission details
    await payment.update({
      status: 'pending_approval',
      submitted_at: new Date(),
      payment_date: payment_date || new Date(),
      payment_method,
      reference_number,
      bank_reference,
      notes
    });

    // Create approval record
    const approval = await PaymentApproval.create({
      payment_id: payment.id,
      submitted_by: req.user.id,
      status: 'pending',
      metadata: {
        payment_date,
        payment_method,
        reference_number,
        bank_reference
      }
    });

    // Create notification for landlord
    await Notification.create({
      user_id: payment.contract.landlord_id,
      payment_id: payment.id,
      type: 'payment_submitted',
      subject: 'Pago pendiente de aprobación',
      message: `El inquilino ${payment.contract.tenant.first_name} ${payment.contract.tenant.last_name} ha enviado un pago de $${payment.amount} para ${payment.contract.property.name}. Requiere tu aprobación.`,
      priority: 'medium',
      action_url: `/payments/approvals/${payment.id}`
    });

    // Log audit entry
    await logPaymentSubmission(req, payment);

    logger.info(`Pago ${payment.reference_number} enviado para aprobación por ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Pago enviado para aprobación exitosamente',
      data: {
        payment,
        approval
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a payment (Landlord only)
 * PUT /api/payments/:id/approve
 */
exports.approvePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            { model: User, as: 'landlord' },
            { model: User, as: 'tenant' }
          ]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verify landlord permissions
    if (req.user.role !== 'landlord') {
      return next(new AppError('Solo los arrendadores pueden aprobar pagos', 403, 'FORBIDDEN'));
    }

    // Verify this is the landlord's property
    if (payment.contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este pago', 403, 'FORBIDDEN'));
    }

    // Check if payment is pending approval
    if (payment.status !== 'pending_approval') {
      return next(new AppError('Este pago no está pendiente de aprobación', 400, 'NOT_PENDING_APPROVAL'));
    }

    // Update payment status
    await payment.update({
      status: 'approved',
      approved_at: new Date()
    });

    // Update approval record
    const approval = await PaymentApproval.findOne({
      where: { payment_id: payment.id, status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    if (approval) {
      await approval.approve(req.user.id, notes);
    }

    // Create notification for tenant
    await Notification.create({
      user_id: payment.contract.tenant_id,
      payment_id: payment.id,
      type: 'payment_approved',
      subject: 'Pago aprobado',
      message: `Tu pago de $${payment.amount} para ${payment.contract.property.name} ha sido aprobado por el arrendador.`,
      priority: 'low',
      action_url: `/payments/${payment.id}`
    });

    // Log audit entry
    await logPaymentApproval(req, payment, req.user);

    logger.info(`Pago ${payment.reference_number} aprobado por ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Pago aprobado exitosamente',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a payment (Landlord only)
 * PUT /api/payments/:id/reject
 */
exports.rejectPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return next(new AppError('Debes proporcionar una razón para rechazar el pago', 400, 'REJECTION_REASON_REQUIRED'));
    }

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            { model: User, as: 'landlord' },
            { model: User, as: 'tenant' }
          ]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verify landlord permissions
    if (req.user.role !== 'landlord') {
      return next(new AppError('Solo los arrendadores pueden rechazar pagos', 403, 'FORBIDDEN'));
    }

    // Verify this is the landlord's property
    if (payment.contract.landlord_id !== req.user.id) {
      return next(new AppError('No tienes permiso sobre este pago', 403, 'FORBIDDEN'));
    }

    // Check if payment is pending approval
    if (payment.status !== 'pending_approval') {
      return next(new AppError('Este pago no está pendiente de aprobación', 400, 'NOT_PENDING_APPROVAL'));
    }

    // Update payment status
    await payment.update({
      status: 'rejected',
      rejected_at: new Date(),
      rejection_reason
    });

    // Update approval record
    const approval = await PaymentApproval.findOne({
      where: { payment_id: payment.id, status: 'pending' },
      order: [['created_at', 'DESC']]
    });

    if (approval) {
      await approval.reject(req.user.id, rejection_reason);
    }

    // Create notification for tenant
    await Notification.create({
      user_id: payment.contract.tenant_id,
      payment_id: payment.id,
      type: 'payment_rejected',
      subject: 'Pago rechazado',
      message: `Tu pago de $${payment.amount} para ${payment.contract.property.name} ha sido rechazado. Razón: ${rejection_reason}`,
      priority: 'high',
      action_url: `/payments/${payment.id}`
    });

    // Log audit entry
    await logPaymentRejection(req, payment, req.user, rejection_reason);

    logger.info(`Pago ${payment.reference_number} rechazado por ${req.user.email}. Razón: ${rejection_reason}`);

    res.status(200).json({
      success: true,
      message: 'Pago rechazado',
      data: { payment, rejection_reason }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending approvals for landlord
 * GET /api/payments/pending-approvals
 */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    if (req.user.role !== 'landlord') {
      return next(new AppError('Solo los arrendadores pueden ver aprobaciones pendientes', 403, 'FORBIDDEN'));
    }

    const { page = 1, limit = 10 } = req.query;

    // Get all contracts for this landlord
    const contracts = await Contract.findAll({
      where: { landlord_id: req.user.id },
      attributes: ['id']
    });
    const contractIds = contracts.map(c => c.id);

    // Find payments pending approval for these contracts
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: {
        contract_id: { [Op.in]: contractIds },
        status: 'pending_approval'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: User,
              as: 'property'
            }
          ]
        },
        {
          model: PaymentApproval,
          as: 'approvals',
          where: { status: 'pending' },
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['submitted_at', 'ASC']],
      distinct: true
    });

    // Calculate summary
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          total: count,
          totalAmount,
          pendingReview: count
        },
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
 * Get user's submission history
 * GET /api/payments/my-submissions
 */
exports.getMySubmissions = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      start_date,
      end_date 
    } = req.query;

    const where = { user_id: req.user.id };

    // Filter by status
    if (status) {
      where.status = status;
    } else {
      // Default: show submitted payments
      where.status = { [Op.in]: ['pending_approval', 'approved', 'rejected'] };
    }

    // Date filter
    if (start_date || end_date) {
      where.submitted_at = {};
      if (start_date) where.submitted_at[Op.gte] = start_date;
      if (end_date) where.submitted_at[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: User,
              as: 'landlord',
              attributes: ['id', 'first_name', 'last_name', 'email']
            },
            {
              model: User,
              as: 'property'
            }
          ]
        },
        {
          model: PaymentApproval,
          as: 'approvals',
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['submitted_at', 'DESC']],
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
 * Get payment with full approval history
 * GET /api/payments/:id/approval-history
 */
exports.getApprovalHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            { model: User, as: 'landlord' },
            { model: User, as: 'tenant' },
            { model: User, as: 'property' }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: PaymentApproval,
          as: 'approvals',
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['id', 'first_name', 'last_name', 'email']
            },
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ],
          order: [['created_at', 'ASC']]
        },
        {
          model: AuditLog,
          as: 'auditLogs',
          where: { entity_type: 'payment' },
          required: false,
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Verify access
    const hasAccess = payment.user_id === req.user.id || 
                      req.user.role === 'landlord' ||
                      (req.user.role === 'landlord' && payment.contract?.landlord_id === req.user.id);

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
 * Resubmit a rejected payment
 * POST /api/payments/:id/resubmit
 */
exports.resubmitPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_method, reference_number, bank_reference, notes } = req.body;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            { model: User, as: 'landlord' }
          ]
        }
      ]
    });

    if (!payment) {
      return next(new AppError('Pago no encontrado', 404, 'PAYMENT_NOT_FOUND'));
    }

    // Only the original creator can resubmit
    if (payment.user_id !== req.user.id) {
      return next(new AppError('No tienes acceso a este pago', 403, 'FORBIDDEN'));
    }

    // Only rejected payments can be resubmitted
    if (payment.status !== 'rejected') {
      return next(new AppError('Solo los pagos rechazados pueden ser reenviados', 400, 'NOT_REJECTED'));
    }

    // Update payment
    await payment.update({
      status: 'pending_approval',
      submitted_at: new Date(),
      payment_date: payment_date || new Date(),
      payment_method,
      reference_number,
      bank_reference,
      notes,
      rejected_at: null,
      rejection_reason: null
    });

    // Create new approval record
    await PaymentApproval.create({
      payment_id: payment.id,
      submitted_by: req.user.id,
      status: 'resubmitted',
      metadata: {
        previous_rejection: payment.rejection_reason,
        new_payment_date: payment_date,
        new_payment_method: payment_method,
        new_reference_number: reference_number
      }
    });

    // Notify landlord
    await Notification.create({
      user_id: payment.contract.landlord_id,
      payment_id: payment.id,
      type: 'payment_submitted',
      subject: 'Pago reenviado',
      message: `El inquilino ha reenviado un pago de $${payment.amount} para ${payment.contract.property.name} después de las correcciones.`,
      priority: 'medium',
      action_url: `/payments/approvals/${payment.id}`
    });

    logger.info(`Pago ${payment.reference_number} reenviado por ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Pago reenviado para aprobación',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};
