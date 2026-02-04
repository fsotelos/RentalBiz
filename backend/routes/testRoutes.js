/**
 * Rutas de prueba (solo para desarrollo)
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

// GET /api/test/user/:email - Verificar si un usuario existe
router.get('/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { email: req.params.email },
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active']
    });
    
    if (user) {
      res.json({ exists: true, user: user.toJSON() });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/test/create-user - Crear usuario de prueba
router.post('/create-user', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;
    
    // Verificar si ya existe
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      // Actualizar contraseña
      existing.password_hash = password;
      await existing.save();
      return res.json({ 
        message: 'Usuario actualizado', 
        user: existing.toJSON() 
      });
    }
    
    // Crear nuevo
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name,
      role: role || 'landlord',
      is_active: true
    });
    
    res.json({ 
      message: 'Usuario creado', 
      user: user.toJSON() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
