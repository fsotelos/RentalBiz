/**
 * Script de prueba para login
 */

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.local')
});

const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    console.log('\n=== Probando Login ===\n');
    
    const email = 'felipe.sotelo@live.com';
    const password = 'Ingphillip!8512';
    
    console.log(`Buscando usuario: ${email}`);
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error('❌ Usuario no encontrado');
      console.log('\nUsuarios en la base de datos:');
      const allUsers = await User.findAll({ 
        attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active'] 
      });
      console.table(allUsers.map(u => u.toJSON()));
      process.exit(1);
    }
    
    console.log('✓ Usuario encontrado:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      is_active: user.is_active
    });
    
    console.log('\nProbando contraseña...');
    const isValid = await user.validatePassword(password);
    
    if (isValid) {
      console.log('✅ Contraseña válida - Login exitoso!');
    } else {
      console.log('❌ Contraseña inválida');
      
      // Verificar el hash almacenado
      console.log('\nDetalles del hash:');
      console.log('Hash almacenado:', user.password_hash);
      
      // Intentar crear un nuevo hash con la misma contraseña
      console.log('\nCreando nuevo hash para comparar...');
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password, salt);
      console.log('Nuevo hash:', newHash);
      console.log('Los hashes deberían ser diferentes pero ambos válidos');
      
      // Verificar si el problema es con el método validatePassword
      const manualCheck = await bcrypt.compare(password, user.password_hash);
      console.log('Verificación manual con bcrypt.compare:', manualCheck);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
