/**
 * Routes for Payment Approval Workflow
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const paymentApprovalController = require('../controllers/paymentApprovalController');
const { authenticate } = require('../middleware/auth');
const { commonValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Payment submission and approval workflow
router.put('/:id/submit', commonValidation.uuid, paymentApprovalController.submitForApproval);
router.put('/:id/approve', commonValidation.uuid, paymentApprovalController.approvePayment);
router.put('/:id/reject', commonValidation.uuid, paymentApprovalController.rejectPayment);
router.post('/:id/resubmit', commonValidation.uuid, paymentApprovalController.resubmitPayment);

// Queries
router.get('/pending-approvals', paymentApprovalController.getPendingApprovals);
router.get('/my-submissions', paymentApprovalController.getMySubmissions);
router.get('/:id/approval-history', commonValidation.uuid, paymentApprovalController.getApprovalHistory);

module.exports = router;
