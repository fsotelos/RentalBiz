/**
 * Migración: Agregar índices para mejorar rendimiento
 * Agrega índices compuestos para optimizar búsquedas frecuentes
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Índices para Users
    await queryInterface.addIndex('users', ['role', 'is_active'], {
      name: 'idx_users_role_active',
      concurrently: true
    });

    await queryInterface.addIndex('users', ['first_name', 'last_name'], {
      name: 'idx_users_names',
      concurrently: true
    });

    // Índices para Properties
    await queryInterface.addIndex('properties', ['user_id', 'status'], {
      name: 'idx_properties_user_status',
      concurrently: true
    });

    await queryInterface.addIndex('properties', ['monthly_rent'], {
      name: 'idx_properties_rent',
      concurrently: true
    });

    console.log('✅ Índices de rendimiento agregados correctamente');
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('users', 'idx_users_role_active');
    await queryInterface.removeIndex('users', 'idx_users_names');
    await queryInterface.removeIndex('properties', 'idx_properties_user_status');
    await queryInterface.removeIndex('properties', 'idx_properties_rent');

    console.log('✅ Índices de rendimiento removidos');
  }
};
