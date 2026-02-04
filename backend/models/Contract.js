/**
 * Modelo de Contrato
 * RentalBiz - Sistema de Gestión de Propiedades
 */

module.exports = (sequelize, DataTypes) => {
  const Contract = sequelize.define('Contract', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    property_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'properties',
        key: 'id'
      }
    },
    landlord_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    contract_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        notEmpty: true
      }
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        notEmpty: true,
        isAfterStart(value) {
          if (new Date(value) <= new Date(this.start_date)) {
            throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
          }
        }
      }
    },
    monthly_rent: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    security_deposit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    payment_frequency: {
      type: DataTypes.ENUM('monthly', 'bimonthly', 'quarterly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    payment_day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 28
      }
    },
    late_payment_penalty: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    terms_conditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    special_conditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'expired', 'terminated', 'renewed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    termination_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    termination_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    renewal_notice_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'contracts',
    indexes: [
      {
        unique: true,
        fields: ['contract_number']
      },
      {
        fields: ['property_id']
      },
      {
        fields: ['landlord_id']
      },
      {
        fields: ['tenant_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['start_date', 'end_date']
      }
    ],
    hooks: {
      beforeValidate: async (contract) => {
        // Generar número de contrato único si no existe
        if (!contract.contract_number) {
          try {
            const count = await sequelize.models.Contract.count();
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            contract.contract_number = `CTR-${date}-${String(count + 1).padStart(5, '0')}-${random}`;
          } catch (error) {
            // Si falla, usar timestamp como fallback
            contract.contract_number = `CTR-${Date.now()}`;
          }
        }
      }
    }
  });

  // Métodos de instancia
  Contract.prototype.isActive = function() {
    return this.status === 'active' && 
           new Date() >= new Date(this.start_date) && 
           new Date() <= new Date(this.end_date);
  };

  Contract.prototype.daysUntilExpiration = function() {
    const today = new Date();
    const end = new Date(this.end_date);
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Contract.prototype.isExpiringSoon = function(days = 30) {
    return this.daysUntilExpiration() <= days && this.daysUntilExpiration() > 0;
  };

  return Contract;
};
