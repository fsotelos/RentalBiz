/**
 * Rutas de Extractos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const extractController = require('../controllers/extractController');
const { authenticate } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/extracts/certificate
 * @desc    Generar certificado de paz y salvo en PDF
 * @query   contractId - ID del contrato
 * @query   month - Mes (1-12)
 * @query   year - Año (ej: 2026)
 * @access  Private (tenant o landlord del contrato)
 */
router.get('/certificate', extractController.generateCertificate);

/**
 * @route   GET /api/extracts/contracts
 * @desc    Obtener contratos del usuario
 * @access  Private
 */
router.get('/contracts', extractController.getUserContracts);

module.exports = router;
