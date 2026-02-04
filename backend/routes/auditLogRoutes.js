/**
 * Routes for Audit Logs
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');
const { commonValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// General audit logs
router.get('/', commonValidation.pagination, auditLogController.getAllAuditLogs);
router.get('/stats', auditLogController.getAuditStats);
router.get('/export', auditLogController.exportAuditLogs);
router.get('/:id', commonValidation.uuid, auditLogController.getAuditLogById);

// Entity-specific audit logs
router.get('/payment/:paymentId', commonValidation.uuid, auditLogController.getPaymentAuditLogs);
router.get('/contract/:contractId', commonValidation.uuid, auditLogController.getContractAuditLogs);

module.exports = router;
