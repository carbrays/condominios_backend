const { query } = require('../../config/db');
const { successResponse } = require('../../utils/response.util');

class ReputacionService {
  async obtenerReputacionPersona(personaId) {
    const { rows: stats } = await query(
      `SELECT 
         COUNT(*) as total_calificaciones,
         ROUND(AVG(puntuacion), 2) as promedio_calificacion
       FROM reputacion_calificaciones
       WHERE calificado_persona_id = $1`,
      [personaId]
    );

    const { rows: historial } = await query(
      `SELECT rc.*, c.nombre as condominio_nombre,
              concat(p.nombres, ' ', p.apellidos) as calificador_nombre
       FROM reputacion_calificaciones rc
       JOIN condominios c ON rc.condominio_id = c.id
       JOIN usuarios u ON rc.calificador_id = u.id
       JOIN personas p ON u.persona_id = p.id
       WHERE rc.calificado_persona_id = $1
       ORDER BY rc.created_at DESC`,
      [personaId]
    );

    return {
      persona_id: personaId,
      total: parseInt(stats[0]?.total_calificaciones || 0, 10),
      promedio: parseFloat(stats[0]?.promedio_calificacion || 5.0),
      historial
    };
  }

  async calificar(condominioId, data, calificadorId, calificadorPersonaId) {
    const { calificado_persona_id, tipo_calificado, puntuacion, comentario } = data;

    if (!calificado_persona_id || !tipo_calificado || !puntuacion) {
      throw { statusCode: 400, message: 'calificado_persona_id, tipo_calificado y puntuacion son requeridos', code: 'VALIDATION_ERROR' };
    }

    if (String(calificadorPersonaId) === String(calificado_persona_id)) {
      throw { statusCode: 400, message: 'No está permitido calificarse a sí mismo', code: 'SELF_RATING_FORBIDDEN' };
    }

    const { rows } = await query(
      `INSERT INTO reputacion_calificaciones
       (condominio_id, calificador_id, calificado_persona_id, tipo_calificado, puntuacion, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [condominioId, calificadorId, calificado_persona_id, tipo_calificado, puntuacion, comentario || null]
    );

    return rows[0];
  }
}

const reputacionService = new ReputacionService();

class ReputacionController {
  async obtener(req, res, next) {
    try {
      const data = await reputacionService.obtenerReputacionPersona(req.params.persona_id);
      return successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }

  async calificar(req, res, next) {
    try {
      const nueva = await reputacionService.calificar(req.condominioId, req.body, req.user.usuario_id, req.user.persona_id);
      return successResponse(res, nueva, 'Calificación registrada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }
}

const reputacionController = new ReputacionController();

module.exports = {
  reputacionService,
  reputacionController
};
