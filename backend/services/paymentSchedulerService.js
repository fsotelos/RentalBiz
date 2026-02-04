/**
 * Payment Scheduler Service
 * RentalBiz - Sistema de Gestión de Propiedades
 * 
 * Handles automatic scheduling of rent and utility payments for rental properties.
 * Supports gap-filling to avoid duplicates and respects lease start dates.
 */

const { v4: uuidv4 } = require('uuid');
const { Payment, Contract, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class PaymentSchedulerService {
  /**
   * Generate rent payment dates based on contract start_date
   * Generates payments for ALL 12 months of the target year
   * @param {Date} startDate - Contract start date
   * @param {number} year - Target year
   * @param {number} paymentDay - Day of month for payment
   * @returns {Array} Array of payment date strings
   */
  generateRentPaymentDates(startDate, year, paymentDay) {
    const dates = [];
    const start = new Date(startDate);
    
    logger.info(`generateRentPaymentDates: startDate=${startDate}, year=${year}, paymentDay=${paymentDay}`);
    logger.info(`Contract start date: ${start}, start year: ${start.getFullYear()}`);
    
    // Generate dates for ALL 12 months of the target year
    for (let month = 0; month < 12; month++) {
      // Handle months with fewer days (e.g., February)
      const maxDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(paymentDay, maxDay);
      const paymentDate = new Date(year, month, day);
      
      logger.debug(`Month ${month + 1}: paymentDate=${paymentDate.toISOString()}, paymentDate >= start: ${paymentDate >= start}`);
      
      // Only include if date is >= lease start date (for first year)
      if (paymentDate >= start) {
        dates.push(paymentDate.toISOString().split('T')[0]);
      }
    }
    
    logger.info(`Generated ${dates.length} dates for ${year}:`, dates);
    return dates;
  }
  
  /**
   * Generate utility payment dates with custom payment day
   * @param {number} year - Target year
   * @param {number} paymentDay - Day of month for utility payment
   * @returns {Array} Array of payment date strings for all 12 months
   */
  generateUtilityPaymentDates(year, paymentDay) {
    const dates = [];
    logger.info(`generateUtilityPaymentDates called: year=${year}, paymentDay=${paymentDay}`);
    
    for (let month = 0; month < 12; month++) {
      // Handle months with fewer days (e.g., February)
      const maxDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(paymentDay, maxDay);
      const paymentDate = new Date(year, month, day);
      
      const dateStr = paymentDate.toISOString().split('T')[0];
      logger.debug(`Month ${month + 1}: paymentDate=${dateStr}`);
      dates.push(dateStr);
    }
    
    logger.info(`Generated ${dates.length} dates for ${year}:`, dates);
    return dates;
  }
  
  /**
   * Get existing payment months for a contract and type
   * @param {string} contractId - Contract UUID
   * @param {string} type - Payment type
   * @param {number} year - Target year
   * @returns {Set} Set of month strings (YYYY-MM format)
   */
  async getExistingPaymentMonths(contractId, type, year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    const payments = await Payment.findAll({
      where: {
        contract_id: contractId,
        type: type,
        due_date: {
          [Op.between]: [startOfYear, endOfYear]
        }
      },
      attributes: ['due_date']
    });
    
    const existingMonths = new Set();
    payments.forEach(p => {
      const date = new Date(p.due_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      existingMonths.add(monthKey);
    });
    
    return existingMonths;
  }
  
  /**
   * Calculate missing payment dates - gap filling logic
   * @param {Array} candidateDates - Potential payment dates
   * @param {Set} existingMonths - Set of existing month strings
   * @returns {Array} Dates to actually create
   */
  calculateMissingPaymentDates(candidateDates, existingMonths) {
    return candidateDates.filter(dateStr => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return !existingMonths.has(monthKey);
    });
  }
  
  /**
   * Schedule rent payments for a contract
   * @param {string} contractId - Contract UUID
   * @param {number} year - Target year
   * @param {number} paymentDay - Payment day (optional, uses contract default)
   * @param {string} userId - User making the request
   * @returns {Object} Result with scheduled and skipped counts
   */
  async scheduleRentPayments(contractId, year, paymentDay = null, userId) {
    const contract = await Contract.findByPk(contractId, {
      include: [{ model: User, as: 'tenant' }]
    });
    
    if (!contract) {
      throw new Error('Contrato no encontrado');
    }
    
    if (contract.status !== 'active') {
      throw new Error('Solo se pueden programar pagos para contratos activos');
    }
    
    const rentPaymentDay = paymentDay || contract.payment_day;
    const existingMonths = await this.getExistingPaymentMonths(contractId, 'rent', year);
    const candidateDates = this.generateRentPaymentDates(contract.start_date, year, rentPaymentDay);
    const missingDates = this.calculateMissingPaymentDates(candidateDates, existingMonths);
    
    const createdPayments = [];
    const skippedDates = [];
    
    // Get existing payments for skipped dates (for reporting)
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    const existingPayments = await Payment.findAll({
      where: {
        contract_id: contractId,
        type: 'rent',
        due_date: {
          [Op.between]: [startOfYear, endOfYear]
        }
      }
    });
    
    // Identify skipped payments
    const existingDates = new Set(existingPayments.map(p => 
      new Date(p.due_date).toISOString().split('T')[0]
    ));
    
    candidateDates.forEach(date => {
      if (existingDates.has(date)) {
        skippedDates.push(date);
      }
    });
    
    // Create payments for missing dates
    for (const dueDate of missingDates) {
      const payment = await Payment.create({
        contract_id: contractId,
        user_id: contract.tenant_id,
        type: 'rent',
        amount: contract.monthly_rent,
        currency: 'MXN',
        due_date: dueDate,
        status: 'pending',
        is_automatic: true,
        notes: `Pago de renta programado automáticamente para ${year}`
      });
      createdPayments.push(payment);
    }
    
    // Create audit log
    if (createdPayments.length > 0) {
      await AuditLog.create({
        user_id: userId,
        action: 'PAYMENT_SCHEDULED',
        entity_type: 'Payment',
        entity_id: createdPayments.map(p => p.id),
        details: {
          type: 'rent',
          contract_id: contractId,
          year: year,
          payment_day: rentPaymentDay,
          scheduled_count: createdPayments.length,
          skipped_count: skippedDates.length,
          total_in_year: candidateDates.length
        },
        ip_address: null
      });
    }
    
    logger.info(`Rent payments scheduled: ${createdPayments.length} created, ${skippedDates.length} skipped for contract ${contractId}`);
    
    return {
      scheduled: createdPayments.length,
      skipped: skippedDates.length,
      total: candidateDates.length,
      payments: createdPayments,
      skippedDates: skippedDates
    };
  }
  
  /**
   * Schedule utility payments for a contract
   * @param {string} contractId - Contract UUID
   * @param {string} utilityType - Utility type (electricity, water, gas)
   * @param {number} paymentDay - Day of month for payment
   * @param {number} amount - Monthly amount for utility
   * @param {number} year - Target year
   * @param {string} userId - User making the request
   * @returns {Object} Result with scheduled and skipped counts
   */
  async scheduleUtilityPayments(contractId, utilityType, paymentDay, amount, year, userId) {
    const contract = await Contract.findByPk(contractId, {
      include: [{ model: User, as: 'tenant' }]
    });
    
    if (!contract) {
      throw new Error('Contrato no encontrado');
    }
    
    if (contract.status !== 'active') {
      throw new Error('Solo se pueden programar pagos para contratos activos');
    }
    
    const existingMonths = await this.getExistingPaymentMonths(contractId, utilityType, year);
    const candidateDates = this.generateUtilityPaymentDates(year, paymentDay);
    const missingDates = this.calculateMissingPaymentDates(candidateDates, existingMonths);
    
    const createdPayments = [];
    const skippedDates = [];
    
    // Get existing payments for skipped dates
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    const existingPayments = await Payment.findAll({
      where: {
        contract_id: contractId,
        type: utilityType,
        due_date: {
          [Op.between]: [startOfYear, endOfYear]
        }
      }
    });
    
    const existingDates = new Set(existingPayments.map(p => 
      new Date(p.due_date).toISOString().split('T')[0]
    ));
    
    candidateDates.forEach(date => {
      if (existingDates.has(date)) {
        skippedDates.push(date);
      }
    });
    
    // Create payments for missing dates
    for (const dueDate of missingDates) {
      const payment = await Payment.create({
        contract_id: contractId,
        user_id: contract.tenant_id,
        type: utilityType,
        amount: amount,
        currency: 'MXN',
        due_date: dueDate,
        status: 'pending',
        is_automatic: true,
        notes: `Pago de ${utilityType} programado automáticamente para ${year}`
      });
      createdPayments.push(payment);
    }
    
    // Create audit log
    if (createdPayments.length > 0) {
      await AuditLog.create({
        user_id: userId,
        action: 'PAYMENT_SCHEDULED',
        entity_type: 'Payment',
        entity_id: createdPayments.map(p => p.id),
        details: {
          type: utilityType,
          contract_id: contractId,
          year: year,
          payment_day: paymentDay,
          amount: amount,
          scheduled_count: createdPayments.length,
          skipped_count: skippedDates.length,
          total_in_year: candidateDates.length
        },
        ip_address: null
      });
    }
    
    logger.info(`Utility payments scheduled: ${createdPayments.length} ${utilityType} payments created, ${skippedDates.length} skipped for contract ${contractId}`);
    
    return {
      scheduled: createdPayments.length,
      skipped: skippedDates.length,
      total: candidateDates.length,
      payments: createdPayments,
      skippedDates: skippedDates
    };
  }
  
  /**
   * Get scheduling status for a contract
   * @param {string} contractId - Contract UUID
   * @param {number} year - Target year
   * @returns {Object} Scheduling status with payments and gaps
   */
  async getScheduleStatus(contractId, year) {
    const contract = await Contract.findByPk(contractId);
    
    if (!contract) {
      throw new Error('Contrato no encontrado');
    }
    
    const paymentTypes = ['rent', 'electricity', 'water', 'gas'];
    const status = {
      contract_id: contractId,
      year: year,
      contract_start_date: contract.start_date,
      payment_day: contract.payment_day,
      monthly_rent: contract.monthly_rent,
      types: {}
    };
    
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    for (const type of paymentTypes) {
      const existingMonths = await this.getExistingPaymentMonths(contractId, type, year);
      
      // Calculate expected months based on type
      let expectedMonths;
      if (type === 'rent') {
        // For rent, start from contract start date
        const rentDates = this.generateRentPaymentDates(contract.start_date, year, contract.payment_day);
        expectedMonths = rentDates.length;
      } else {
        // For utilities, all 12 months
        expectedMonths = 12;
      }
      
      // Get existing payments
      const payments = await Payment.findAll({
        where: {
          contract_id: contractId,
          type: type,
          due_date: {
            [Op.between]: [startOfYear, endOfYear]
          }
        },
        order: [['due_date', 'ASC']]
      });
      
      status.types[type] = {
        expected: expectedMonths,
        existing: existingMonths.size,
        missing: expectedMonths - existingMonths.size,
        payments: payments.map(p => ({
          id: p.id,
          due_date: p.due_date,
          amount: p.amount,
          status: p.status,
          is_automatic: p.is_automatic
        })),
        missingMonths: Array.from({ length: 12 }, (_, i) => {
          const monthYear = `${year}-${String(i + 1).padStart(2, '0')}`;
          return existingMonths.has(monthYear) ? null : monthYear;
        }).filter(Boolean)
      };
    }
    
    return status;
  }
  
  /**
   * Fill gaps in payment schedule for a specific type
   * @param {string} contractId - Contract UUID
   * @param {string} type - Payment type
   * @param {number} year - Target year
   * @param {number} paymentDay - Payment day
   * @param {number} amount - Payment amount
   * @param {string} userId - User making the request
   * @returns {Object} Result with scheduled count
   */
  async fillGaps(contractId, type, year, paymentDay, amount, userId) {
    const contract = await Contract.findByPk(contractId, {
      include: [{ model: User, as: 'tenant' }]
    });
    
    if (!contract) {
      throw new Error('Contrato no encontrado');
    }
    
    const existingMonths = await this.getExistingPaymentMonths(contractId, type, year);
    
    let candidateDates;
    if (type === 'rent') {
      candidateDates = this.generateRentPaymentDates(contract.start_date, year, paymentDay);
    } else {
      candidateDates = this.generateUtilityPaymentDates(year, paymentDay);
    }
    
    const missingDates = this.calculateMissingPaymentDates(candidateDates, existingMonths);
    
    const createdPayments = [];
    
    for (const dueDate of missingDates) {
      const paymentAmount = type === 'rent' ? contract.monthly_rent : amount;
      
      const payment = await Payment.create({
        contract_id: contractId,
        user_id: contract.tenant_id,
        type: type,
        amount: paymentAmount,
        currency: 'MXN',
        due_date: dueDate,
        status: 'pending',
        is_automatic: true,
        notes: `Pago rellenado automáticamente para ${year}`
      });
      createdPayments.push(payment);
    }
    
    // Create audit log
    await AuditLog.create({
      user_id: userId,
      action: 'PAYMENT_GAPS_FILLED',
      entity_type: 'Payment',
      entity_id: createdPayments.map(p => p.id),
      details: {
        type: type,
        contract_id: contractId,
        year: year,
        filled_count: createdPayments.length
      },
      ip_address: null
    });
    
    return {
      filled: createdPayments.length,
      payments: createdPayments
    };
  }
}

module.exports = new PaymentSchedulerService();
