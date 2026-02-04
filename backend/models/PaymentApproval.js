/**
 * Payment Approval Model
 * Tracks the approval lifecycle for each payment submission
 * RentalBiz - Sistema de Gestión de Propiedades
 */

module.exports = (sequelize, DataTypes) => {
  const PaymentApproval = sequelize.define('PaymentApproval', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    submitted_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'resubmitted'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'payment_approvals',
    indexes: [
      {
        fields: ['payment_id']
      },
      {
        fields: ['submitted_by']
      },
      {
        fields: ['status']
      },
      {
        fields: ['approved_by']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // Instance methods
  PaymentApproval.prototype.isPending = function() {
    return this.status === 'pending';
  };

  PaymentApproval.prototype.isApproved = function() {
    return this.status === 'approved';
  };

  PaymentApproval.prototype.isRejected = function() {
    return this.status === 'rejected';
  };

  PaymentApproval.prototype.approve = async function(approverId, notes = null) {
    this.status = 'approved';
    this.approved_by = approverId;
    this.approved_at = new Date();
    this.notes = notes;
    return this.save();
  };

  PaymentApproval.prototype.reject = async function(approverId, reason) {
    this.status = 'rejected';
    this.approved_by = approverId;
    this.approved_at = new Date();
    this.rejection_reason = reason;
    return this.save();
  };

  return PaymentApproval;
};
