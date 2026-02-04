/**
 * Migration: Create Payment Approval Workflow Tables
 * Creates PaymentApproval and AuditLog tables
 * RentalBiz - Sistema de Gestión de Propiedades
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create payment_approvals table
    await queryInterface.createTable('payment_approvals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      payment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'payments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      submitted_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'resubmitted'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add indexes for payment_approvals
    await queryInterface.addIndex('payment_approvals', ['payment_id']);
    await queryInterface.addIndex('payment_approvals', ['submitted_by']);
    await queryInterface.addIndex('payment_approvals', ['status']);
    await queryInterface.addIndex('payment_approvals', ['approved_by']);
    await queryInterface.addIndex('payment_approvals', ['created_at']);

    // Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of entity (payment, contract, property, user)'
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Action performed (created, updated, approved, rejected, etc.)'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous values before the action'
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New values after the action'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Client IP address'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/client user agent'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional context data'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add indexes for audit_logs
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['entity_type']);

    // Update payments table to add new fields for approval workflow
    await queryInterface.addColumn('payments', 'requires_approval', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('payments', 'submitted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'rejected_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Update the ENUM for status to include new states
    await queryInterface.changeColumn('payments', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'pending_approval',
        'approved',
        'paid',
        'overdue',
        'rejected',
        'cancelled',
        'partial'
      ),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new enum values from payments status
    await queryInterface.changeColumn('payments', 'status', {
      type: Sequelize.ENUM('pending', 'paid', 'overdue', 'cancelled', 'partial'),
      allowNull: false,
      defaultValue: 'pending'
    });

    // Remove added columns from payments
    await queryInterface.removeColumn('payments', 'requires_approval');
    await queryInterface.removeColumn('payments', 'submitted_at');
    await queryInterface.removeColumn('payments', 'approved_at');
    await queryInterface.removeColumn('payments', 'rejected_at');
    await queryInterface.removeColumn('payments', 'rejection_reason');

    // Drop tables
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('payment_approvals');

    // Remove enum types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_payment_approvals_status;');
  }
};
