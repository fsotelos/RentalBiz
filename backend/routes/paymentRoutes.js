/**
 * Rutas de Pagos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const paymentSchedulerController = require('../controllers/paymentSchedulerController');
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

// === Rutas de Programación de Pagos ===

// Programar pagos de renta
router.post('/schedule/rent', 
  authorize('landlord'), 
  paymentSchedulerController.scheduleRentPayments
);

// Programar pagos de servicios públicos
router.post('/schedule/utility', 
  authorize('landlord'), 
  paymentSchedulerController.scheduleUtilityPayments
);

// Obtener estado de programación de un contrato
router.get('/schedule/status/:contractId', 
  paymentSchedulerController.getScheduleStatus
);

// Rellenar espacios vacíos en pagos
router.post('/schedule/fill-gaps', 
  authorize('landlord'), 
  paymentSchedulerController.fillGaps
);

// Vista previa de programación sin crear pagos
router.post('/schedule/preview', 
  paymentSchedulerController.previewSchedule
);

module.exports = router;
