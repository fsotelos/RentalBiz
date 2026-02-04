/**
 * Modelo de Pago
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    contract_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contracts',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('rent', 'electricity', 'water', 'gas', 'deposit', 'maintenance', 'other'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'MXN'
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        notEmpty: true
      }
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'paid', 'overdue', 'cancelled', 'partial'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'online', 'other'),
      allowNull: true
    },
    reference_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    bank_reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    receipt_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    penalty_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    },
    penalty_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_automatic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reminder_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reminder_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'payments',
    indexes: [
      {
        fields: ['contract_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['due_date']
      },
      {
        fields: ['status', 'due_date']
      }
    ],
    hooks: {
      beforeCreate: async (payment) => {
        // Generar número de referencia único
        if (!payment.reference_number) {
          const prefix = payment.type.toUpperCase().substring(0, 3);
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const uniqueId = uuidv4().split('-')[0].toUpperCase();
          payment.reference_number = `REF-${prefix}-${date}-${uniqueId}`;
        }
        
        // Marcar como overdue si la fecha de vencimiento ya pasó
        if (new Date(payment.due_date) < new Date() && payment.status === 'pending') {
          payment.status = 'overdue';
        }
      }
    }
  });

  // Métodos de instancia
  Payment.prototype.isOverdue = function() {
    return this.status === 'pending' && new Date(this.due_date) < new Date();
  };

  Payment.prototype.daysOverdue = function() {
    if (this.status !== 'pending' && this.status !== 'overdue') return 0;
    const dueDate = new Date(this.due_date);
    const today = new Date();
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Payment.prototype.totalAmount = function() {
    const amount = parseFloat(this.amount) || 0;
    const penalty = parseFloat(this.penalty_amount) || 0;
    return amount + penalty;
  };

  Payment.prototype.isPaid = function() {
    return this.status === 'paid';
  };

  return Payment;
};
