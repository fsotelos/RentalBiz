/**
 * Modelos de Base de Datos - Sequelize
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { Sequelize, DataTypes, Model } = require('sequelize');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Inicializar Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    define: config.define,
    pool: config.pool,
    dialectOptions: config.dialectOptions || {}
  }
);

// Importar modelos
const User = require('./User')(sequelize, DataTypes);
const Property = require('./Property')(sequelize, DataTypes);
const Contract = require('./Contract')(sequelize, DataTypes);
const Payment = require('./Payment')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const PaymentApproval = require('./PaymentApproval')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);

// Definir asociaciones
// User - Property: Un usuario puede tener muchas propiedades
User.hasMany(Property, { 
  as: 'properties', 
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});
Property.belongsTo(User, { 
  as: 'owner', 
  foreignKey: 'user_id' 
});

// User - Contract (Landlord): Un usuario puede ser arrendador de muchos contratos
User.hasMany(Contract, { 
  as: 'landlordContracts', 
  foreignKey: 'landlord_id',
  onDelete: 'CASCADE'
});
Contract.belongsTo(User, { 
  as: 'landlord', 
  foreignKey: 'landlord_id' 
});

// User - Contract (Tenant): Un usuario puede ser arrendatario de muchos contratos
User.hasMany(Contract, { 
  as: 'tenantContracts', 
  foreignKey: 'tenant_id',
  onDelete: 'CASCADE'
});
Contract.belongsTo(User, { 
  as: 'tenant', 
  foreignKey: 'tenant_id' 
});

// Property - Contract: Una propiedad puede tener muchos contratos
Property.hasMany(Contract, { 
  as: 'contracts', 
  foreignKey: 'property_id',
  onDelete: 'CASCADE'
});
Contract.belongsTo(Property, { 
  as: 'property', 
  foreignKey: 'property_id' 
});

// Contract - Payment: Un contrato puede tener muchos pagos
Contract.hasMany(Payment, { 
  as: 'payments', 
  foreignKey: 'contract_id',
  onDelete: 'CASCADE'
});
Payment.belongsTo(Contract, { 
  as: 'contract', 
  foreignKey: 'contract_id' 
});

// User - Payment: Un usuario puede hacer muchos pagos
User.hasMany(Payment, { 
  as: 'payments', 
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});
Payment.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'user_id' 
});

// User - Notification: Un usuario puede tener muchas notificaciones
User.hasMany(Notification, { 
  as: 'notifications', 
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'user_id' 
});

// Payment - Notification: Un pago puede tener muchas notificaciones
Payment.hasMany(Notification, { 
  as: 'notifications', 
  foreignKey: 'payment_id',
  onDelete: 'SET NULL'
});
Notification.belongsTo(Payment, { 
  as: 'payment', 
  foreignKey: 'payment_id' 
});

// Payment - PaymentApproval: Un pago puede tener muchas aprobaciones
Payment.hasMany(PaymentApproval, { 
  as: 'approvals', 
  foreignKey: 'payment_id',
  onDelete: 'CASCADE'
});
PaymentApproval.belongsTo(Payment, { 
  as: 'payment', 
  foreignKey: 'payment_id' 
});

// User - PaymentApproval (Submitted by): Un usuario puede submitir muchas aprobaciones
User.hasMany(PaymentApproval, { 
  as: 'submittedApprovals', 
  foreignKey: 'submitted_by',
  onDelete: 'CASCADE'
});
PaymentApproval.belongsTo(User, { 
  as: 'submitter', 
  foreignKey: 'submitted_by' 
});

// User - PaymentApproval (Approved by): Un usuario puede aprobar muchos pagos
User.hasMany(PaymentApproval, { 
  as: 'approvedApprovals', 
  foreignKey: 'approved_by',
  onDelete: 'SET NULL'
});
PaymentApproval.belongsTo(User, { 
  as: 'approver', 
  foreignKey: 'approved_by' 
});

// User - AuditLog: Un usuario puede tener muchos registros de auditoría
User.hasMany(AuditLog, { 
  as: 'auditLogs', 
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});
AuditLog.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'user_id' 
});

module.exports = {
  sequelize,
  Sequelize,
  User,
  Property,
  Contract,
  Payment,
  Notification,
  PaymentApproval,
  AuditLog
};
