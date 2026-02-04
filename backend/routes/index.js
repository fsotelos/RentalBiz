/**
 * Rutas de la API
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const propertyRoutes = require('./propertyRoutes');
const contractRoutes = require('./contractRoutes');
const paymentRoutes = require('./paymentRoutes');
const paymentApprovalRoutes = require('./paymentApprovalRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const notificationRoutes = require('./notificationRoutes');
const userRoutes = require('./userRoutes');
const testRoutes = require('./testRoutes');

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas de prueba (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  router.use('/test', testRoutes);
}

// Rutas de propiedades
router.use('/properties', propertyRoutes);

// Rutas de contratos
router.use('/contracts', contractRoutes);

// Rutas de pagos
router.use('/payments', paymentRoutes);

// Rutas de aprobación de pagos
router.use('/payments', paymentApprovalRoutes);

// Rutas de auditoría
router.use('/audit-logs', auditLogRoutes);

// Rutas de notificaciones
router.use('/notifications', notificationRoutes);

// Endpoint de estado del sistema
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
