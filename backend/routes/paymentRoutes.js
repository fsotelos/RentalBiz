/**
 * Rutas de Pagos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { paymentValidation, commonValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de pagos
router.get('/', commonValidation.pagination, paymentController.getAllPayments);
router.get('/pending', paymentController.getPendingPayments);
router.get('/overdue', paymentController.getOverduePayments);
router.get('/summary', paymentController.getPaymentSummary);
router.get('/:id', commonValidation.uuid, paymentController.getPaymentById);
router.post('/', paymentValidation.create, paymentController.createPayment);
router.put('/:id', commonValidation.uuid, paymentController.updatePayment);
router.put('/:id/pay', commonValidation.uuid, paymentController.markAsPaid);
router.delete('/:id', commonValidation.uuid, paymentController.deletePayment);
router.post('/generate-recurring', paymentController.generateRecurringPayments);

module.exports = router;
