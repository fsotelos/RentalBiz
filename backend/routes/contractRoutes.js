/**
 * Rutas de Contratos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticate, authorize } = require('../middleware/auth');
const { contractValidation, commonValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de contratos
router.get('/', commonValidation.pagination, contractController.getAllContracts);
router.get('/expiring', contractController.getExpiringContracts);
router.get('/:id', commonValidation.uuid, contractController.getContractById);
router.post('/', contractValidation.create, contractController.createContract);
router.put('/:id', commonValidation.uuid, contractController.updateContract);
router.put('/:id/status', commonValidation.uuid, contractController.updateContractStatus);
router.post('/:id/terminate', commonValidation.uuid, contractController.terminateContract);

module.exports = router;
