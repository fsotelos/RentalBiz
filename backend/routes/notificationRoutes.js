/**
 * Rutas de Notificaciones
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { commonValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de notificaciones
router.get('/', commonValidation.pagination, notificationController.getAllNotifications);
router.get('/dashboard', notificationController.getDashboardNotifications);
router.get('/settings', notificationController.getNotificationSettings);
router.get('/:id', commonValidation.uuid, notificationController.getNotificationById);
router.put('/:id/read', commonValidation.uuid, notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', commonValidation.uuid, notificationController.deleteNotification);
router.put('/settings', notificationController.updateNotificationSettings);

// Rutas de administración (solo para landlords)
router.post('/send-reminders', authorize('landlord'), notificationController.sendPaymentReminders);

module.exports = router;
