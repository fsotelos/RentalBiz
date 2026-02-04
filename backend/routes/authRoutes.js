/**
 * Rutas de Autenticación
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { userValidation } = require('../middleware/validation');

// Rutas públicas
router.post('/register', userValidation.register, authController.register);
router.post('/login', userValidation.login, authController.login);

// Rutas protegidas
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, userValidation.update, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verifyToken);
router.post('/refresh', authenticate, authController.refreshToken);

module.exports = router;
