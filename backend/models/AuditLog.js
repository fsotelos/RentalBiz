/**
 * Audit Log Model
 * Comprehensive audit trail for all payment-related actions
 * RentalBiz - Sistema de Gestión de Propiedades
 */

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of entity (payment, contract, property, user)'
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the entity'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Action performed (created, updated, approved, rejected, etc.)'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Previous values before the action'
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'New values after the action'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Client IP address'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/client user agent'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional context data'
    }
  }, {
    tableName: 'audit_logs',
    indexes: [
      {
        fields: ['entity_type', 'entity_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['entity_type']
      }
    ]
  });

  // Static methods
  AuditLog.log = async function(options) {
    const {
      entityType,
      entityId,
      action,
      userId,
      oldValues = null,
      newValues = null,
      ipAddress = null,
      userAgent = null,
      metadata = {}
    } = options;

    return this.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: userId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata
    });
  };

  // Instance methods
  AuditLog.prototype.getChanges = function() {
    return {
      old: this.old_values,
      new: this.new_values
    };
  };

  return AuditLog;
};
