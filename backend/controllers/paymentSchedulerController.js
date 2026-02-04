/**
 * Payment Scheduler Controller
 * RentalBiz - Sistema de Gestión de Propiedades
 * 
 * API endpoints for scheduling rent and utility payments.
 */

const paymentSchedulerService = require('../services/paymentSchedulerService');
const { Contract } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Schedule rent payments for a contract
 * POST /api/payments/schedule/rent
 */
exports.scheduleRentPayments = async (req, res, next) => {
  try {
    const { contract_id, year, payment_day } = req.body;
    const userId = req.user.id;
    
    // Validate contract_id
    if (!contract_id) {
      return next(new AppError('El ID del contrato es requerido', 400, 'MISSING_CONTRACT_ID'));
    }
    
    // Validate year
    const targetYear = year || new Date().getFullYear();
    if (targetYear < 2020 || targetYear > 2030) {
      return next(new AppError('Año inválido', 400, 'INVALID_YEAR'));
    }
    
    // Verify contract belongs to landlord
    const contract = await Contract.findOne({
      where: {
        id: contract_id,
        landlord_id: userId
      }
    });
    
    if (!contract) {
      return next(new AppError('Contrato no encontrado o no tienes acceso', 404, 'CONTRACT_NOT_FOUND'));
    }
    
    // Schedule rent payments
    const result = await paymentSchedulerService.scheduleRentPayments(
      contract_id,
      targetYear,
      payment_day,
      userId
    );
    
    res.status(201).json({
      success: true,
      message: `Pagos de renta programados exitosamente`,
      data: {
        scheduled: result.scheduled,
        skipped: result.skipped,
        total_in_year: result.total,
        skipped_dates: result.skippedDates,
        payments: result.payments.map(p => ({
          id: p.id,
          due_date: p.due_date,
          amount: p.amount,
          status: p.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error scheduling rent payments:', error);
    next(error);
  }
};

/**
 * Schedule utility payments for a contract
 * POST /api/payments/schedule/utility
 */
exports.scheduleUtilityPayments = async (req, res, next) => {
  try {
    const { contract_id, utility_type, payment_day, amount, year } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!contract_id) {
      return next(new AppError('El ID del contrato es requerido', 400, 'MISSING_CONTRACT_ID'));
    }
    if (!utility_type) {
      return next(new AppError('El tipo de servicio es requerido', 400, 'MISSING_UTILITY_TYPE'));
    }
    if (!payment_day) {
      return next(new AppError('El día de pago es requerido', 400, 'MISSING_PAYMENT_DAY'));
    }
    if (!amount || amount <= 0) {
      return next(new AppError('El monto debe ser mayor a 0', 400, 'INVALID_AMOUNT'));
    }
    
    // Validate utility type
    const validTypes = ['electricity', 'water', 'gas'];
    if (!validTypes.includes(utility_type)) {
      return next(new AppError(`Tipo de servicio inválido. Tipos válidos: ${validTypes.join(', ')}`, 400, 'INVALID_UTILITY_TYPE'));
    }
    
    // Validate payment day
    if (payment_day < 1 || payment_day > 31) {
      return next(new AppError('El día de pago debe ser entre 1 y 31', 400, 'INVALID_PAYMENT_DAY'));
    }
    
    // Validate year
    const targetYear = year || new Date().getFullYear();
    if (targetYear < 2020 || targetYear > 2030) {
      return next(new AppError('Año inválido', 400, 'INVALID_YEAR'));
    }
    
    // Verify contract belongs to landlord
    const contract = await Contract.findOne({
      where: {
        id: contract_id,
        landlord_id: userId
      }
    });
    
    if (!contract) {
      return next(new AppError('Contrato no encontrado o no tienes acceso', 404, 'CONTRACT_NOT_FOUND'));
    }
    
    // Schedule utility payments
    const result = await paymentSchedulerService.scheduleUtilityPayments(
      contract_id,
      utility_type,
      payment_day,
      amount,
      targetYear,
      userId
    );
    
    res.status(201).json({
      success: true,
      message: `Pagos de ${utility_type} programados exitosamente`,
      data: {
        scheduled: result.scheduled,
        skipped: result.skipped,
        total_in_year: result.total,
        skipped_dates: result.skippedDates,
        payments: result.payments.map(p => ({
          id: p.id,
          due_date: p.due_date,
          amount: p.amount,
          status: p.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error scheduling utility payments:', error);
    next(error);
  }
};

/**
 * Get scheduling status for a contract
 * GET /api/payments/schedule/status/:contractId
 */
exports.getScheduleStatus = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { year } = req.query;
    const userId = req.user.id;
    
    // Validate year
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2030) {
      return next(new AppError('Año inválido', 400, 'INVALID_YEAR'));
    }
    
    // Verify access to contract
    const contract = await Contract.findOne({
      where: {
        id: contractId,
        [Op.or]: [
          { landlord_id: userId },
          { tenant_id: userId }
        ]
      }
    });
    
    if (!contract) {
      return next(new AppError('Contrato no encontrado o no tienes acceso', 404, 'CONTRACT_NOT_FOUND'));
    }
    
    // Get schedule status
    const status = await paymentSchedulerService.getScheduleStatus(contractId, targetYear);
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting schedule status:', error);
    next(error);
  }
};

/**
 * Fill gaps in payment schedule
 * POST /api/payments/schedule/fill-gaps
 */
exports.fillGaps = async (req, res, next) => {
  try {
    const { contract_id, type, year, payment_day, amount } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!contract_id) {
      return next(new AppError('El ID del contrato es requerido', 400, 'MISSING_CONTRACT_ID'));
    }
    if (!type) {
      return next(new AppError('El tipo de pago es requerido', 400, 'MISSING_PAYMENT_TYPE'));
    }
    
    // Validate type
    const validTypes = ['rent', 'electricity', 'water', 'gas'];
    if (!validTypes.includes(type)) {
      return next(new AppError(`Tipo de pago inválido. Tipos válidos: ${validTypes.join(', ')}`, 400, 'INVALID_PAYMENT_TYPE'));
    }
    
    // Validate year
    const targetYear = year || new Date().getFullYear();
    if (targetYear < 2020 || targetYear > 2030) {
      return next(new AppError('Año inválido', 400, 'INVALID_YEAR'));
    }
    
    // For utility types, validate payment day and amount
    let paymentDay = payment_day;
    let paymentAmount = amount;
    
    if (type !== 'rent') {
      if (!payment_day || payment_day < 1 || payment_day > 31) {
        return next(new AppError('El día de pago debe ser entre 1 y 31', 400, 'INVALID_PAYMENT_DAY'));
      }
      if (!amount || amount <= 0) {
        return next(new AppError('El monto debe ser mayor a 0', 400, 'INVALID_AMOUNT'));
      }
    }
    
    // Verify contract belongs to landlord
    const contract = await Contract.findOne({
      where: {
        id: contract_id,
        landlord_id: userId
      }
    });
    
    if (!contract) {
      return next(new AppError('Contrato no encontrado o no tienes acceso', 404, 'CONTRACT_NOT_FOUND'));
    }
    
    // Get payment day from contract for rent type
    if (type === 'rent') {
      paymentDay = contract.payment_day;
      paymentAmount = contract.monthly_rent;
    }
    
    // Fill gaps
    const result = await paymentSchedulerService.fillGaps(
      contract_id,
      type,
      targetYear,
      paymentDay,
      paymentAmount,
      userId
    );
    
    res.status(201).json({
      success: true,
      message: `Se填补aron ${result.filled} pagos faltantes`,
      data: {
        filled: result.filled,
        payments: result.payments.map(p => ({
          id: p.id,
          due_date: p.due_date,
          amount: p.amount,
          status: p.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error filling payment gaps:', error);
    next(error);
  }
};

/**
 * Preview scheduled payments without creating them
 * POST /api/payments/schedule/preview
 */
exports.previewSchedule = async (req, res, next) => {
  try {
    const { contract_id, type, year, payment_day, amount } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!contract_id) {
      return next(new AppError('El ID del contrato es requerido', 400, 'MISSING_CONTRACT_ID'));
    }
    if (!type) {
      return next(new AppError('El tipo de pago es requerido', 400, 'MISSING_PAYMENT_TYPE'));
    }
    
    // Validate year
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    logger.info(`previewSchedule: received year=${year}, targetYear=${targetYear}`);
    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2030) {
      return next(new AppError('Año inválido', 400, 'INVALID_YEAR'));
    }
    
    // Verify access to contract
    const contract = await Contract.findOne({
      where: {
        id: contract_id,
        [Op.or]: [
          { landlord_id: userId },
          { tenant_id: userId }
        ]
      }
    });
    
    if (!contract) {
      return next(new AppError('Contrato no encontrado o no tienes acceso', 404, 'CONTRACT_NOT_FOUND'));
    }
    
    // Calculate preview
    let candidateDates;
    if (type === 'rent') {
      candidateDates = paymentSchedulerService.generateRentPaymentDates(
        contract.start_date,
        targetYear,
        payment_day || contract.payment_day
      );
    } else {
      if (!payment_day || !amount) {
        return next(new AppError('Para servicios públicos se requiere día de pago y monto', 400, 'MISSING_UTILITY_PARAMS'));
      }
      candidateDates = paymentSchedulerService.generateUtilityPaymentDates(targetYear, payment_day);
    }
    
    // Get existing months
    const existingMonths = await paymentSchedulerService.getExistingPaymentMonths(contract_id, type, targetYear);
    const missingDates = paymentSchedulerService.calculateMissingPaymentDates(candidateDates, existingMonths);
    
    res.status(200).json({
      success: true,
      data: {
        contract_id: contract_id,
        type: type,
        year: targetYear,
        total_expected: candidateDates.length,
        existing: existingMonths.size,
        will_create: missingDates.length,
        will_skip: candidateDates.length - missingDates.length,
        payments_to_create: missingDates.map(date => ({
          due_date: date,
          amount: type === 'rent' ? contract.monthly_rent : amount,
          type: type
        })),
        payments_to_skip: candidateDates
          .filter(date => {
            const dateObj = new Date(date);
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            return existingMonths.has(monthKey);
          })
          .map(date => ({
            due_date: date,
            reason: 'Ya existe un pago para este mes'
          }))
      }
    });
  } catch (error) {
    logger.error('Error previewing schedule:', error);
    next(error);
  }
};
