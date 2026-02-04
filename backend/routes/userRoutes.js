/**
 * Rutas de Usuarios
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/users - Obtener todos los usuarios
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', userController.getUserById);

module.exports = router;
