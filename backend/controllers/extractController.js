/**
 * Controlador de Extractos
 * RentalBiz - Sistema de Gestión de Propiedades
 */

const PDFDocument = require('pdfkit');
const { Contract, Payment, User, Property } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Generar certificado de paz y salvo en PDF
 */
exports.generateCertificate = async (req, res) => {
  try {
    const { contractId, month, year } = req.query;
    const userId = req.user.id;

    // Validar parámetros
    if (!contractId || !month || !year) {
      return res.status(400).json({
        error: 'Se requieren contractId, month y year'
      });
    }

    // Obtener el contrato con relaciones
    const contract = await Contract.findOne({
      where: { id: contractId },
      include: [
        {
          model: User,
          as: 'tenant',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: User,
          as: 'landlord',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address', 'city', 'state']
        }
      ]
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    logger.info(`[CERTIFICATE] Contract found: ${contract.contract_number}, start_date: ${contract.start_date}`);

    // Verificar que el usuario tenga acceso al contrato
    if (contract.tenant_id !== userId && contract.landlord_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este contrato' });
    }

    // Determinar el rango de fechas para el mes
    // El certificado muestra los pagos hasta la fecha de corte (fin del mes seleccionado)
    // Se incluyen: pending, overdue (cualquier fecha hasta la fecha de corte)
    // Se excluyen: approved, paid, y pagos con due_date después de la fecha de corte
    
    // Fecha de corte: último día del mes seleccionado
    const cutoffDate = new Date(parseInt(year), parseInt(month), 0); // Último día del mes
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    logger.info(`Fecha de corte para certificado: ${cutoffDateStr}`);

    // Obtener todos los pagos del contrato hasta la fecha de corte
    // INCLUYE: pending, overdue (cualquier fecha hasta cutoff)
    // EXCLUYE: approved, paid, y pagos con due_date después de cutoff
    const allPayments = await Payment.findAll({
      where: {
        contract_id: contractId,
        due_date: {
          [Op.lte]: cutoffDateStr  // Menor o igual a la fecha de corte
        },
        status: {
          [Op.notIn]: ['approved', 'paid']  // Excluir approved y paid
        }
      },
      order: [['due_date', 'ASC']]
    });

    logger.info(`Pagos hasta la fecha de corte: ${allPayments.length}`);

    // Filtrar pagos para mostrarlos en el certificado: solo los del mes seleccionado
    // Esto es para la presentación visual en la tabla
    const filteredPayments = allPayments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      const dueMonth = dueDate.getMonth() + 1; // 1-12
      const dueYear = dueDate.getFullYear();

      // Solo mostrar pagos del mes seleccionado
      return dueYear === parseInt(year) && dueMonth === parseInt(month);
    });

    // Log para debug
    logger.info(`Pagos encontrados para ${year}-${month}:`, {
      totalUnapprovedUntilCutoff: allPayments.length,
      filteredForDisplay: filteredPayments.length,
      payments: allPayments.map(p => ({
        type: p.type,
        amount: p.amount,
        status: p.status,
        due_date: p.due_date
      }))
    });

    // Calcular totales usando TODOS los pagos hasta la fecha de corte
    const paymentSummary = {
      rent: { pending: 0, paid: 0, status: 'N/A' },
      electricity: { pending: 0, paid: 0, status: 'N/A' },
      water: { pending: 0, paid: 0, status: 'N/A' },
      gas: { pending: 0, paid: 0, status: 'N/A' },
      other: { pending: 0, paid: 0, status: 'N/A' }
    };

    let totalPaid = 0;
    let totalPending = 0;

    // Usar allPayments para el cálculo total (todos los no aprobados hasta cutoff)
    allPayments.forEach(payment => {
      const type = payment.type === 'maintenance' || payment.type === 'deposit' ? 'other' : payment.type;
      const amount = parseFloat(payment.amount);

      // Los estados 'approved' y 'paid' ya están excluidos de allPayments
      // Todos los pagos en allPayments son pending, overdue, o similar
      paymentSummary[type].pending += amount;
      totalPending += amount;

      // Determinar el estado para mostrar
      if (paymentSummary[type].status === 'N/A') {
        paymentSummary[type].status = payment.status === 'overdue' ? 'overdue' : 'pending';
      }
    });

    // Log del resumen
    logger.info(`Resumen de pagos:`, {
      paymentSummary,
      totalPaid,
      totalPending
    });

    // Determinar si está a paz y salvo
    // Un cliente está a paz y salvo si NO tiene ningún pago pendiente/vencido hasta la fecha de corte
    const isPazYSalvo = allPayments.length === 0;

    // Crear el PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Certificado de Pagos - ${contract.contract_number}`,
        Author: 'RentalBiz',
        Subject: `Extracto de pagos para ${getMonthName(month)} ${year}`
      }
    });

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${contractId}-${year}-${month}.pdf`);

    // Pipe el PDF a la respuesta
    doc.pipe(res);

    // ====== DISEÑO DEL PDF ======

    // Encabezado
    doc.fillColor('#2563eb')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('CERTIFICADO DE PAGOS', { align: 'center' });

    doc.moveDown(0.5);

    // Subtítulo
    doc.fillColor('#64748b')
       .fontSize(12)
       .font('Helvetica')
       .text(`Periodo: ${getMonthName(month)} ${year}`, { align: 'center' });

    doc.moveDown(0.3);
    doc.fillColor('#64748b')
       .fontSize(10)
       .text(`Generado: ${new Date().toLocaleDateString('es-MX', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, { align: 'center' });

    doc.moveDown(1.5);

    // Línea separadora
    doc.strokeColor('#e2e8f0')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(1);

    // Estado del certificado
    const statusColor = isPazYSalvo ? '#10b981' : '#ef4444';
    const statusText = isPazYSalvo ? 'PAZ Y SALVO' : 'CON SALDO PENDIENTE';

    doc.fillColor(statusColor)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(statusText, { align: 'center' });

    doc.moveDown(1.5);

    // Información del arrendatario
    doc.fillColor('#1e293b')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DEL ARRENDATARIO');

    doc.moveDown(0.5);

    doc.fillColor('#475569')
       .fontSize(10)
       .font('Helvetica')
       .text(`Nombre: ${contract.tenant?.first_name || 'N/A'} ${contract.tenant?.last_name || 'N/A'}`)
       .text(`Correo: ${contract.tenant?.email || 'N/A'}`)
       .text(`Teléfono: ${contract.tenant?.phone || 'N/A'}`);

    doc.moveDown(1);

    // Información del contrato y propiedad
    doc.fillColor('#1e293b')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DEL CONTRATO');

    doc.moveDown(0.5);

    doc.fillColor('#475569')
       .fontSize(10)
       .font('Helvetica')
       .text(`Número de contrato: ${contract.contract_number}`)
       .text(`Unidad arrendada: ${contract.property?.name || 'N/A'}`)
       .text(`Dirección: ${contract.property?.address || 'N/A'}, ${contract.property?.city || 'N/A'}, ${contract.property?.state || 'N/A'}`)
       .text(`Arrendador: ${contract.landlord?.first_name || 'N/A'} ${contract.landlord?.last_name || 'N/A'}`);

    doc.moveDown(1.5);

    // Línea separadora
    doc.strokeColor('#e2e8f0')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(1);

    // Detalle de pagos
    doc.fillColor('#1e293b')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('DETALLE DE PAGOS');

    doc.moveDown(0.5);

    // Crear tabla de pagos
    const tableTop = doc.y;
    const colWidths = [180, 100, 100, 100];
    const colPositions = [50, 230, 330, 430];

    // Encabezados de tabla
    doc.fillColor('#ffffff')
       .rect(50, tableTop, 495, 25)
       .fill('#2563eb');

    doc.fillColor('#ffffff')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('Concepto', colPositions[0] + 5, tableTop + 8, { width: colWidths[0] - 10 })
       .text('Estado', colPositions[1] + 5, tableTop + 8, { width: colWidths[1] - 10 })
       .text('Pagado', colPositions[2] + 5, tableTop + 8, { width: colWidths[2] - 10 })
       .text('Pendiente', colPositions[3] + 5, tableTop + 8, { width: colWidths[3] - 10 });

    let currentY = tableTop + 25;

    // Función para agregar fila
    const addRow = (concept, status, paid, pending, isTotal = false) => {
      const bgColor = isTotal ? '#f1f5f9' : (currentY % 2 === 0 ? '#ffffff' : '#f8fafc');
      
      doc.fillColor(bgColor)
         .rect(50, currentY, 495, 25)
         .fill();

      const textColor = isTotal ? '#1e293b' : '#475569';
      const font = isTotal ? 'Helvetica-Bold' : 'Helvetica';
      
      doc.fillColor(textColor)
         .fontSize(9)
         .font(font)
         .text(concept, colPositions[0] + 5, currentY + 8, { width: colWidths[0] - 10 });

      doc.fillColor(getStatusColor(status))
         .text(getStatusText(status), colPositions[1] + 5, currentY + 8, { width: colWidths[1] - 10 });

      doc.fillColor(textColor)
         .text(`$${paid.toFixed(2)}`, colPositions[2] + 5, currentY + 8, { width: colWidths[2] - 10 });

      doc.fillColor(textColor)
         .text(`$${pending.toFixed(2)}`, colPositions[3] + 5, currentY + 8, { width: colWidths[3] - 10 });

      currentY += 25;
    };

    // Agregar filas de conceptos
    addRow('Renta', paymentSummary.rent.status, paymentSummary.rent.paid, paymentSummary.rent.pending);
    addRow('Luz (Electricidad)', paymentSummary.electricity.status, paymentSummary.electricity.paid, paymentSummary.electricity.pending);
    addRow('Agua', paymentSummary.water.status, paymentSummary.water.paid, paymentSummary.water.pending);
    addRow('Gas', paymentSummary.gas.status, paymentSummary.gas.paid, paymentSummary.gas.pending);
    addRow('Otros servicios', paymentSummary.other.status, paymentSummary.other.paid, paymentSummary.other.pending);

    // Línea separadora antes del total
    doc.strokeColor('#cbd5e1')
       .lineWidth(1)
       .moveTo(50, currentY)
       .lineTo(545, currentY)
       .stroke();

    currentY += 5;

    // Fila de totales
    addRow('TOTAL', isPazYSalvo ? 'paid' : 'pending', totalPaid, totalPending, true);

    doc.moveDown(3);

    // Resumen final
    if (isPazYSalvo) {
      doc.fillColor('#10b981')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('✓ Certificamos que todos los pagos correspondientes al periodo se encuentran al día.', {
           align: 'center'
         });
    } else {
      doc.fillColor('#ef4444')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(`⚠ Saldo pendiente total: $${totalPending.toFixed(2)}`, {
           align: 'center'
         });
    }

    doc.moveDown(2);

    // Pie de página
    const bottomY = doc.page.height - 100;
    doc.y = bottomY;

    doc.strokeColor('#e2e8f0')
       .lineWidth(0.5)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();

    doc.moveDown(0.5);

    doc.fillColor('#94a3b8')
       .fontSize(8)
       .font('Helvetica')
       .text('Este documento es generado automáticamente por RentalBiz', { align: 'center' })
       .text('Para cualquier aclaración, contacte al arrendador', { align: 'center' });

    // Finalizar el PDF
    doc.end();

    logger.info(`Certificado generado para contrato ${contractId} - ${year}-${month}`);

  } catch (error) {
    logger.error('Error generando certificado:', error);
    logger.error('Error stack:', error.stack);
    
    // Only send JSON error if response hasn't started
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error al generar el certificado',
        details: error.message
      });
    } else {
      // Response already started, just log
      logger.error('Response already sent, cannot send error JSON');
    }
  }
};

/**
 * Obtener contratos del usuario para el selector
 */
exports.getUserContracts = async (req, res) => {
  try {
    const userId = req.user.id;

    const contracts = await Contract.findAll({
      where: {
        [Op.or]: [
          { tenant_id: userId },
          { landlord_id: userId }
        ],
        status: {
          [Op.in]: ['active', 'pending', 'expired']
        }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['name', 'address']
        },
        {
          model: User,
          as: 'tenant',
          attributes: ['first_name', 'last_name']
        },
        {
          model: User,
          as: 'landlord',
          attributes: ['first_name', 'last_name']
        }
      ],
      order: [['start_date', 'DESC']]
    });

    res.json(contracts);

  } catch (error) {
    logger.error('Error obteniendo contratos:', error);
    res.status(500).json({
      error: 'Error al obtener contratos',
      details: error.message
    });
  }
};

// ====== FUNCIONES AUXILIARES ======

function getMonthName(month) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || 'Mes inválido';
}

function getStatusColor(status) {
  switch (status) {
    case 'paid':
    case 'approved':
      return '#10b981';
    case 'partial':
      return '#3b82f6';
    case 'pending':
      return '#f59e0b';
    case 'rejected':
    case 'overdue':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'paid':
    case 'approved':
      return 'Pagado';
    case 'partial':
      return 'Parcial';
    case 'pending':
      return 'Pendiente';
    case 'rejected':
      return 'Rechazado';
    case 'overdue':
      return 'Vencido';
    default:
      return 'N/A';
  }
}
