const { query } = require('../../config/db');
const { successResponse } = require('../../utils/response.util');

class NotificacionesService {
  async listarPorUsuario(usuarioId) {
    const { rows } = await query(
      `SELECT * FROM notificaciones 
       WHERE usuario_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [usuarioId]
    );

    const { rows: unreadCount } = await query(
      `SELECT COUNT(*) FROM notificaciones WHERE usuario_id = $1 AND leida = FALSE`,
      [usuarioId]
    );

    return {
      notificaciones: rows,
      no_leidas: parseInt(unreadCount[0]?.count || 0, 10)
    };
  }

  async marcarComoLeida(id, usuarioId) {
    const { rows } = await query(
      `UPDATE notificaciones 
       SET leida = TRUE 
       WHERE id = $1 AND usuario_id = $2 
       RETURNING *;`,
      [id, usuarioId]
    );
    return rows[0] || null;
  }

  async marcarTodasLeidas(usuarioId) {
    await query(
      `UPDATE notificaciones SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE`,
      [usuarioId]
    );
    return true;
  }
}

const notificacionesService = new NotificacionesService();

class NotificacionesController {
  async listar(req, res, next) {
    try {
      const data = await notificacionesService.listarPorUsuario(req.user.usuario_id);
      return successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }

  async marcarLeida(req, res, next) {
    try {
      const notif = await notificacionesService.marcarComoLeida(req.params.id, req.user.usuario_id);
      return successResponse(res, notif, 'Notificación marcada como leída');
    } catch (error) {
      next(error);
    }
  }

  async marcarTodasLeidas(req, res, next) {
    try {
      await notificacionesService.marcarTodasLeidas(req.user.usuario_id);
      return successResponse(res, null, 'Todas las notificaciones marcadas como leídas');
    } catch (error) {
      next(error);
    }
  }
}

const notificacionesController = new NotificacionesController();

module.exports = {
  notificacionesService,
  notificacionesController
};
