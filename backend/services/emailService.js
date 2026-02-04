/**
 * Servicio de Envío de Emails
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Crear transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Envía un email
 */
const sendEmail = async (to, subject, html, text) => {
  try {
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"RentalBiz" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html
    });

    logger.info(`Email enviado a ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Error enviando email a ${to}:`, error);
    throw error;
  }
};

/**
 * Envía recordatorio de pago
 */
const sendPaymentReminder = async (payment, user) => {
  const dueDate = new Date(payment.due_date).toLocaleDateString('es-MX');
  const amount = parseFloat(payment.amount).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });

  const subject = `📅 Recordatorio: Pago de ${payment.type} - Vence ${dueDate}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .payment-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .amount { font-size: 24px; color: #2563eb; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Recordatorio de Pago</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.first_name} ${user.last_name}</strong>,</p>
          <p>Te recordamos que tienes un pago próximo a vencer:</p>
          
          <div class="payment-info">
            <p><strong>Concepto:</strong> ${getPaymentTypeLabel(payment.type)}</p>
            <p><strong>Propiedad:</strong> ${payment.contract?.property?.name || 'N/A'}</p>
            <p><strong>Monto:</strong> <span class="amount">${amount}</span></p>
            <p><strong>Fecha de vencimiento:</strong> ${dueDate}</p>
            <p><strong>Referencia:</strong> ${payment.reference_number}</p>
          </div>
          
          <p>Por favor realiza el pago antes de la fecha de vencimiento para evitar cargos adicionales.</p>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/payments/${payment.id}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Detalles del Pago
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático de RentalBiz.</p>
          <p>Si ya realizaste el pago, por favor ignora este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
};

/**
 * Envía notificación de pago vencido
 */
const sendPaymentOverdue = async (payment, user) => {
  const dueDate = new Date(payment.due_date).toLocaleDateString('es-MX');
  const amount = parseFloat(payment.amount).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });
  
  const daysOverdue = Math.ceil((new Date() - new Date(payment.due_date)) / (1000 * 60 * 60 * 24));

  const subject = `⚠️ URGENTE: Pago vencido - ${payment.contract?.property?.name}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .alert { background: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .amount { font-size: 24px; color: #dc2626; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Pago Vencido</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.first_name} ${user.last_name}</strong>,</p>
          
          <div class="alert">
            <p style="margin: 0;"><strong>Tu pago ha vencido hace ${daysOverdue} días.</strong></p>
          </div>
          
          <p>Detalles del pago:</p>
          <ul>
            <li><strong>Concepto:</strong> ${getPaymentTypeLabel(payment.type)}</li>
            <li><strong>Propiedad:</strong> ${payment.contract?.property?.name || 'N/A'}</li>
            <li><strong>Monto:</strong> <span class="amount">${amount}</span></li>
            <li><strong>Fecha de vencimiento:</strong> ${dueDate}</li>
            <li><strong>Días de atraso:</strong> ${daysOverdue}</li>
          </ul>
          
          <p>Por favor realiza el pago lo antes posible para evitar complicaciones.</p>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/payments/${payment.id}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Realizar Pago Ahora
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático de RentalBiz.</p>
          <p>Para cualquier aclaración, contacta a tu arrendador.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
};

/**
 * Envía confirmación de contrato activado
 */
const sendContractActivated = async (contract, user) => {
  const startDate = new Date(contract.start_date).toLocaleDateString('es-MX');
  const endDate = new Date(contract.end_date).toLocaleDateString('es-MX');
  const rent = parseFloat(contract.monthly_rent).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });

  const subject = '✅ Contrato de Arrendamiento Activado';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .contract-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Contrato Activado</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.first_name} ${user.last_name}</strong>,</p>
          <p>Tu contrato de arrendamiento ha sido activado exitosamente.</p>
          
          <div class="contract-info">
            <p><strong>Propiedad:</strong> ${contract.property?.name}</p>
            <p><strong>Dirección:</strong> ${contract.property?.address}</p>
            <p><strong>Fecha de inicio:</strong> ${startDate}</p>
            <p><strong>Fecha de fin:</strong> ${endDate}</p>
            <p><strong>Renta mensual:</strong> ${rent}</p>
            <p><strong>Número de contrato:</strong> ${contract.contract_number}</p>
          </div>
          
          <p>¡Bienvenido a tu nueva propiedad!</p>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/contracts/${contract.id}" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Contrato Completo
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático de RentalBiz.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
};

/**
 * Envía recordatorio de contrato por vencer
 */
const sendContractExpiring = async (contract, user) => {
  const endDate = new Date(contract.end_date).toLocaleDateString('es-MX');
  const daysLeft = contract.daysUntilExpiration();

  const subject = `📄 Tu contrato vence en ${daysLeft} días`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Contrato por Vencer</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.first_name} ${user.last_name}</strong>,</p>
          <p>Te informamos que tu contrato está por vencer.</p>
          
          <div class="info">
            <p><strong>Propiedad:</strong> ${contract.property?.name}</p>
            <p><strong>Dirección:</strong> ${contract.property?.address}</p>
            <p><strong>Fecha de vencimiento:</strong> ${endDate}</p>
            <p><strong>Días restantes:</strong> ${daysLeft}</p>
          </div>
          
          <p>Si deseas renovar tu contrato, contacta a tu arrendador.</p>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/contracts/${contract.id}" 
               style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ver Detalles del Contrato
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático de RentalBiz.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
};

/**
 * Obtiene etiqueta legible para tipo de pago
 */
const getPaymentTypeLabel = (type) => {
  const labels = {
    rent: 'Renta',
    electricity: 'Electricidad',
    water: 'Agua',
    gas: 'Gas',
    deposit: 'Depósito',
    maintenance: 'Mantenimiento',
    other: 'Otro'
  };
  return labels[type] || type;
};

module.exports = {
  sendEmail,
  sendPaymentReminder,
  sendPaymentOverdue,
  sendContractActivated,
  sendContractExpiring
};
