/**
 * Script para crear usuario de prueba
 */

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.local')
});

const { User } = require('./models');

async function createTestUser() {
  try {
    console.log('Creando usuario de prueba...\n');
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      where: { email: 'felipe.sotelo@live.com' } 
    });
    
    if (existingUser) {
      console.log('El usuario ya existe. Actualizando contraseña...');
      existingUser.password_hash = 'Ingphillip!8512';
      await existingUser.save();
      console.log('✅ Contraseña actualizada');
    } else {
      // Crear nuevo usuario
      const user = await User.create({
        email: 'felipe.sotelo@live.com',
        password_hash: 'Ingphillip!8512',
        first_name: 'Felipe',
        last_name: 'Sotelo',
        role: 'landlord',
        is_active: true
      });
      console.log('✅ Usuario creado exitosamente');
      console.log(user.toJSON());
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestUser();
