/**
 * Rutas de Propiedades
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middleware/auth');
const { propertyValidation, commonValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de propiedades
router.get('/', commonValidation.pagination, propertyController.getAllProperties);
router.get('/stats', propertyController.getPropertyStats);
router.get('/:id', commonValidation.uuid, propertyController.getPropertyById);
router.post('/', propertyValidation.create, propertyController.createProperty);
router.put('/:id', commonValidation.uuid, propertyValidation.update, propertyController.updateProperty);
router.delete('/:id', commonValidation.uuid, propertyController.deleteProperty);

module.exports = router;
