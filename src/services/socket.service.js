const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware de autenticación y autorización para Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('AUTHENTICATION_ERROR: Token requerido'));
      }

      const decoded = jwt.verify(token, env.JWT.secret);
      
      // Validar usuario en DB
      const userRes = await query('SELECT id, persona_id, activo FROM usuarios WHERE id = $1', [decoded.usuarioId]);
      if (userRes.rows.length === 0 || !userRes.rows[0].activo) {
        return next(new Error('AUTHENTICATION_ERROR: Usuario inactivo o no encontrado'));
      }

      // Obtener membresías activas del usuario para autorizar salas
      const membRes = await query(
        `SELECT m.condominio_id, m.rol_id 
         FROM membresias m 
         WHERE m.usuario_id = $1 AND m.estado = 'ACTIVO'`,
        [decoded.usuarioId]
      );

      socket.user = {
        usuarioId: decoded.usuarioId,
        personaId: decoded.personaId,
        condominios: membRes.rows.map(r => String(r.condominio_id)),
        roles: membRes.rows.map(r => r.rol_id)
      };

      next();
    } catch (err) {
      return next(new Error('AUTHENTICATION_ERROR: Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const { usuarioId, condominios } = socket.user;
    
    // Unir a sala personal de usuario
    socket.join(`usuario:${usuarioId}`);

    // Unir automáticamente sólo a las salas de condominios autorizados
    condominios.forEach((condId) => {
      socket.join(`condominio:${condId}`);
    });

    console.log(`[SOCKET.IO] Cliente conectado: ${socket.id} | Usuario: ${usuarioId} | Salas: condominios [${condominios.join(', ')}]`);

    socket.on('disconnect', () => {
      console.log(`[SOCKET.IO] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado.');
  }
  return io;
}

/**
 * Emitir a una sala de condominio
 */
function emitToCondominio(condominioId, event, data) {
  if (!io) return;
  io.to(`condominio:${condominioId}`).emit(event, data);
}

/**
 * Emitir a un usuario específico
 */
function emitToUser(usuarioId, event, data) {
  if (!io) return;
  io.to(`usuario:${usuarioId}`).emit(event, data);
}

module.exports = {
  initSocket,
  getIO,
  emitToCondominio,
  emitToUser
};
