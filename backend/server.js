/**
 * RentalBiz - Servidor Principal
 * Sistema de Gestión Integral de Propiedades en Renta
 */

const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env.local')
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Parseo de JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Documentación API
if (process.env.NODE_ENV !== 'production') {
  app.get('/api-docs', (req, res) => {
    res.json({
      message: 'Documentación API disponible en /api-docs',
      endpoints: {
        auth: '/api/auth',
        properties: '/api/properties',
        contracts: '/api/contracts',
        payments: '/api/payments',
        notifications: '/api/notifications'
      }
    });
  });
}

// Servir archivos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Manejo de errores
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// Inicio del servidor
const startServer = async () => {
  try {
    // Verificar conexión a base de datos
    await sequelize.authenticate();
    logger.info('✅ Conexión a base de datos establecida correctamente');

    // Sincronizar modelos (solo en desarrollo)
    // NOTA: Deshabilitado temporalmente para evitar bloqueos en índices
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: false });
    //   logger.info('✅ Modelos verificados con la base de datos');
    // }

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 RentalBiz Server Iniciado                           ║
║                                                           ║
║   📡 Servidor:    ${`http://localhost:${PORT}`.padEnd(30)}║
║   🌍 Entorno:     ${process.env.NODE_ENV.padEnd(30)}║
║   📊 Base datos:  ${`MySQL ${process.env.DB_HOST}:${process.env.DB_PORT}`.padEnd(30)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Programar tareas de recordatorio de pagos (cada día a las 9 AM)
const cron = require('node-cron');
cron.schedule('0 9 * * *', async () => {
  logger.info('📧 Ejecutando envío de recordatorios de pagos...');
  try {
    const { sendPaymentReminders } = require('./services/notificationService');
    await sendPaymentReminders();
    logger.info('✅ Recordatorios de pagos enviados');
  } catch (error) {
    logger.error('❌ Error enviando recordatorios:', error);
  }
});

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  logger.info('👋 Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('👋 Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
