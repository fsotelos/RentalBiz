const { User } = require('./models');

async function testLogin() {
  try {
    console.log('🔍 Buscando usuario...');
    const user = await User.findOne({ where: { email: 'felipe.sotelo@live.com' } });
    
    if (!user) {
      console.log('❌ Usuario NO encontrado en la base de datos');
      console.log('📝 Usuarios disponibles:');
      const allUsers = await User.findAll();
      allUsers.forEach(u => console.log(`  - ${u.email}`));
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:');
    console.log(JSON.stringify(user.toJSON(), null, 2));
    
    console.log('\n🔐 Probando contraseña...');
    const isValid = await user.validatePassword('Ingphillip!8512');
    
    if (isValid) {
      console.log('✅ Contraseña CORRECTA');
    } else {
      console.log('❌ Contraseña INCORRECTA');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
