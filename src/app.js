const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// Importación de módulos
const authRoutes = require('./modules/auth/auth.routes');
const personasRoutes = require('./modules/personas/personas.routes');
const condominiosRoutes = require('./modules/condominios/condominios.routes');
const unidadesRoutes = require('./modules/unidades/unidades.routes');
const membresiasRoutes = require('./modules/membresias/membresias.routes');
const finanzasRoutes = require('./modules/finanzas/finanzas.routes');
const pagosRoutes = require('./modules/pagos/pagos.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');
const conserjeriaRoutes = require('./modules/conserjeria/conserjeria.routes');
const reservasRoutes = require('./modules/reservas/reservas.routes');
const comunicadosRoutes = require('./modules/comunicados/comunicados.routes');
const encuestasRoutes = require('./modules/encuestas/encuestas.routes');
const incidenciasRoutes = require('./modules/incidencias/incidencias.routes');
const reputacionRoutes = require('./modules/reputacion/reputacion.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const auditoriaRoutes = require('./modules/auditoria/auditoria.routes');

const app = express();

// Seguridad con Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const corsOptions = {
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-condominio-id']
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Máximo 1000 peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de solicitudes excedido, por favor intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED',
    data: null
  }
});
app.use('/api', limiter);

// Parseo de JSON y urlencoded con límites
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servidor de archivos estáticos para uploads locales
app.use('/uploads', express.static(env.STORAGE.localPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas de API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/personas', personasRoutes);
app.use('/api/v1/condominios', condominiosRoutes);
app.use('/api/v1/unidades', unidadesRoutes);
app.use('/api/v1/membresias', membresiasRoutes);
app.use('/api/v1/finanzas', finanzasRoutes);
app.use('/api/v1/pagos', pagosRoutes);
app.use('/api/v1/servicios', serviciosRoutes);
app.use('/api/v1/conserjeria', conserjeriaRoutes);
app.use('/api/v1/reservas', reservasRoutes);
app.use('/api/v1/comunicados', comunicadosRoutes);
app.use('/api/v1/encuestas', encuestasRoutes);
app.use('/api/v1/incidencias', incidenciasRoutes);
app.use('/api/v1/reputacion', reputacionRoutes);
app.use('/api/v1/notificaciones', notificacionesRoutes);
app.use('/api/v1/auditoria', auditoriaRoutes);

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
