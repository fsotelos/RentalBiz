/**
 * Middleware de Validación
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const { validationResult, body, param, query } = require('express-validator');

/**
 * Maneja errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Validaciones de usuario
 */
const userValidation = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/\d/)
      .withMessage('La contraseña debe contener al menos un número')
      .matches(/[a-zA-Z]/)
      .withMessage('La contraseña debe contener al menos una letra'),
    body('first_name')
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ max: 100 })
      .withMessage('El nombre no puede exceder 100 caracteres'),
    body('last_name')
      .trim()
      .notEmpty()
      .withMessage('El apellido es obligatorio')
      .isLength({ max: 100 })
      .withMessage('El apellido no puede exceder 100 caracteres'),
    body('role')
      .optional()
      .isIn(['landlord', 'tenant'])
      .withMessage('Rol inválido'),
    body('phone')
      .optional()
      .isLength({ max: 20 })
      .withMessage('El teléfono no puede exceder 20 caracteres'),
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es obligatoria'),
    handleValidationErrors
  ],
  
  update: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('first_name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El nombre no puede exceder 100 caracteres'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('El apellido no puede exceder 100 caracteres'),
    body('phone')
      .optional()
      .isLength({ max: 20 })
      .withMessage('El teléfono no puede exceder 20 caracteres'),
    handleValidationErrors
  ]
};

/**
 * Validaciones de propiedad
 */
const propertyValidation = {
  create: [
    body('type')
      .isIn(['apartment', 'house', 'warehouse'])
      .withMessage('Tipo de propiedad inválido'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ max: 200 })
      .withMessage('El nombre no puede exceder 200 caracteres'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('La dirección es obligatoria'),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('La ciudad es obligatoria'),
    body('state')
      .trim()
      .notEmpty()
      .withMessage('El estado es obligatorio'),
    body('monthly_rent')
      .isFloat({ min: 0 })
      .withMessage('La renta mensual debe ser un número positivo'),
    body('bedrooms')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Las habitaciones deben ser un número entero'),
    body('bathrooms')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Los baños deben ser un número'),
    body('area_sqft')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El área debe ser un número positivo'),
    body('status')
      .optional()
      .isIn(['available', 'rented', 'maintenance', 'inactive'])
      .withMessage('Estado inválido'),
    handleValidationErrors
  ],
  
  update: [
    body('type')
      .optional()
      .isIn(['apartment', 'house', 'warehouse'])
      .withMessage('Tipo de propiedad inválido'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('El nombre no puede exceder 200 caracteres'),
    body('monthly_rent')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('La renta mensual debe ser un número positivo'),
    handleValidationErrors
  ]
};

/**
 * Validaciones de contrato
 */
const contractValidation = {
  create: [
    body('property_id')
      .isUUID()
      .withMessage('ID de propiedad inválido'),
    body('tenant_id')
      .isUUID()
      .withMessage('ID de inquilino inválido'),
    body('start_date')
      .isISO8601()
      .withMessage('Fecha de inicio inválida')
      .toDate(),
    body('end_date')
      .isISO8601()
      .withMessage('Fecha de fin inválida')
      .toDate()
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.start_date)) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }
        return true;
      }),
    body('monthly_rent')
      .isFloat({ min: 0 })
      .withMessage('La renta mensual debe ser un número positivo'),
    body('payment_frequency')
      .optional()
      .isIn(['monthly', 'bimonthly', 'quarterly'])
      .withMessage('Frecuencia de pago inválida'),
    body('payment_day')
      .optional()
      .isInt({ min: 1, max: 28 })
      .withMessage('El día de pago debe estar entre 1 y 28'),
    handleValidationErrors
  ]
};

/**
 * Validaciones de pago
 */
const paymentValidation = {
  create: [
    body('contract_id')
      .isUUID()
      .withMessage('ID de contrato inválido'),
    body('type')
      .isIn(['rent', 'electricity', 'water', 'gas', 'deposit', 'maintenance', 'other'])
      .withMessage('Tipo de pago inválido'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('El monto debe ser un número positivo'),
    body('due_date')
      .isISO8601()
      .withMessage('Fecha de vencimiento inválida'),
    handleValidationErrors
  ],
  
  update: [
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('El monto debe ser un número positivo'),
    body('status')
      .optional()
      .isIn(['pending', 'paid', 'overdue', 'cancelled', 'partial'])
      .withMessage('Estado inválido'),
    handleValidationErrors
  ]
};

/**
 * Validaciones comunes
 */
const commonValidation = {
  uuid: [
    param('id')
      .isUUID()
      .withMessage('ID inválido'),
    handleValidationErrors
  ],
  
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100')
      .toInt(),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  userValidation,
  propertyValidation,
  contractValidation,
  paymentValidation,
  commonValidation
};
