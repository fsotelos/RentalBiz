/**
 * Migration: Update Notification Types
 * Adds payment approval-related notification types
 * RentalBiz - Sistema de Gestión de Propiedades
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, drop the existing enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notifications_type;');
    
    // Create new enum type with additional values
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_notifications_type_new AS ENUM (
        'payment_reminder',
        'payment_overdue',
        'payment_received',
        'payment_submitted',
        'payment_approved',
        'payment_rejected',
        'contract_expiring',
        'contract_renewal',
        'contract_activated',
        'contract_terminated',
        'general',
        'system'
      );
    `);

    // Update the column to use the new enum type
    await queryInterface.changeColumn('notifications', 'type', {
      type: Sequelize.ENUM(
        'payment_reminder',
        'payment_overdue',
        'payment_received',
        'payment_submitted',
        'payment_approved',
        'payment_rejected',
        'contract_expiring',
        'contract_renewal',
        'contract_activated',
        'contract_terminated',
        'general',
        'system'
      ),
      allowNull: false,
      defaultValue: 'general'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the new enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notifications_type_new;');
    
    // Recreate original enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_notifications_type AS ENUM (
        'payment_reminder',
        'payment_overdue',
        'payment_received',
        'contract_expiring',
        'contract_renewal',
        'contract_activated',
        'contract_terminated',
        'general',
        'system'
      );
    `);

    // Update the column back to original enum
    await queryInterface.changeColumn('notifications', 'type', {
      type: Sequelize.ENUM(
        'payment_reminder',
        'payment_overdue',
        'payment_received',
        'contract_expiring',
        'contract_renewal',
        'contract_activated',
        'contract_terminated',
        'general',
        'system'
      ),
      allowNull: false,
      defaultValue: 'general'
    });
  }
};
