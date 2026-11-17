const { query } = require('../../config/db');

class AuditoriaService {
  /**
   * Registra un evento de auditoría
   */
  async registrar({ usuarioId, condominioId, accion, entidad, entidadId, datosAnteriores = null, datosNuevos = null, ip = null, userAgent = null }) {
    try {
      await query(
        `INSERT INTO auditoria_logs 
         (usuario_id, condominio_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          usuarioId || null,
          condominioId || null,
          accion,
          entidad,
          String(entidadId || ''),
          datosAnteriores ? JSON.stringify(datosAnteriores) : null,
          datosNuevos ? JSON.stringify(datosNuevos) : null,
          ip,
          userAgent
        ]
      );
    } catch (error) {
      console.error('[AUDITORIA ERROR] Error registrando bitácora de auditoría:', error.message);
    }
  }

  /**
   * Consulta logs con filtros y paginación
   */
  async listar({ condominioId, usuarioId, entidad, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (condominioId) {
      conditions.push(`a.condominio_id = $${paramIndex++}`);
      params.push(condominioId);
    }
    if (usuarioId) {
      conditions.push(`a.usuario_id = $${paramIndex++}`);
      params.push(usuarioId);
    }
    if (entidad) {
      conditions.push(`a.entidad = $${paramIndex++}`);
      params.push(entidad);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM auditoria_logs a ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT a.*, p.nombres, p.apellidos, p.ci
       FROM auditoria_logs a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       LEFT JOIN personas p ON u.persona_id = p.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    return {
      items: dataRes.rows,
      total,
      page,
      limit
    };
  }
}

module.exports = new AuditoriaService();
