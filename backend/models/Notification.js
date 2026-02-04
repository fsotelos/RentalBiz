/**
 * Modelo de Notificación
 * RentalBiz - Sistema de Gestión de Propiedades
 */

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    contract_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'contracts',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
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
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    html_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivery_status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed', 'bounced'),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    action_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'notifications',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['payment_id']
      },
      {
        fields: ['contract_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // Métodos de instancia
  Notification.prototype.markAsRead = async function() {
    this.is_read = true;
    this.read_at = new Date();
    return this.save();
  };

  Notification.prototype.markAsSent = async function() {
    this.is_sent = true;
    this.sent_at = new Date();
    return this.save();
  };

  Notification.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date(this.expires_at) < new Date();
  };

  return Notification;
};
