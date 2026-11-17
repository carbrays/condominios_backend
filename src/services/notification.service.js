const { query } = require('../config/db');
const { emitToUser, emitToCondominio } = require('./socket.service');
const firebaseService = require('./firebase.service');

class NotificationService {
  /**
   * Envía notificación a un usuario específico a través de BD, Socket.IO y FCM
   */
  async notifyUser(usuarioId, { condominioId, titulo, mensaje, tipo = 'GENERAL', dataPayload = {} }) {
    try {
      // 1. Persistencia en Base de Datos
      const res = await query(
        `INSERT INTO notificaciones (usuario_id, condominio_id, titulo, mensaje, tipo, data_payload)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *;`,
        [usuarioId, condominioId || null, titulo, mensaje, tipo, JSON.stringify(dataPayload)]
      );
      const notificacion = res.rows[0];

      // 2. Tiempo real vía Socket.IO
      emitToUser(usuarioId, 'notificacion.creada', notificacion);

      // 3. Notificación Push a través de Firebase (FCM)
      const devRes = await query(
        `SELECT token_fcm FROM dispositivos WHERE usuario_id = $1 AND activo = TRUE`,
        [usuarioId]
      );
      const tokens = devRes.rows.map(r => r.token_fcm).filter(Boolean);

      if (tokens.length > 0) {
        await firebaseService.sendToMultiple(tokens, {
          title: titulo,
          body: mensaje,
          data: { ...dataPayload, notificacionId: String(notificacion.id), tipo }
        });
      }

      return notificacion;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE ERROR] Error notificando a usuario:', error);
      return null;
    }
  }

  /**
   * Envía notificación masiva a todos los miembros de un condominio
   */
  async notifyCondominio(condominioId, { titulo, mensaje, tipo = 'COMUNICADO', dataPayload = {} }) {
    try {
      // Obtener todos los usuarios activos del condominio
      const { rows: miembros } = await query(
        `SELECT DISTINCT usuario_id FROM membresias WHERE condominio_id = $1 AND estado = 'ACTIVO'`,
        [condominioId]
      );

      // Emitir evento por Socket.IO al canal del condominio
      emitToCondominio(condominioId, 'comunicado.creado', {
        condominioId,
        titulo,
        mensaje,
        tipo,
        fecha: new Date().toISOString()
      });

      // Crear notificación para cada miembro
      for (const m of miembros) {
        await this.notifyUser(m.usuario_id, {
          condominioId,
          titulo,
          mensaje,
          tipo,
          dataPayload
        });
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE ERROR] Error notificando condominio:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
