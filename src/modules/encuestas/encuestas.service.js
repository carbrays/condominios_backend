const { query } = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response.util');

class EncuestasService {
  async listar(condominioId) {
    const { rows } = await query(
      `SELECT e.*, concat(p.nombres, ' ', p.apellidos) as creador_nombre,
              (SELECT COUNT(*) FROM votos WHERE encuesta_id = e.id) as total_votos
       FROM encuestas e
       JOIN usuarios u ON e.creado_por = u.id
       JOIN personas p ON u.persona_id = p.id
       WHERE e.condominio_id = $1
       ORDER BY e.created_at DESC`,
      [condominioId]
    );

    // Obtener opciones para cada encuesta
    for (const e of rows) {
      const { rows: opciones } = await query(
        `SELECT eo.*, 
                COUNT(v.id) as total_votos_opcion,
                COALESCE(SUM(v.peso_voto), 0) as puntos_ponderados
         FROM encuesta_opciones eo
         LEFT JOIN votos v ON eo.id = v.opcion_id
         WHERE eo.encuesta_id = $1
         GROUP BY eo.id
         ORDER BY eo.orden ASC`,
        [e.id]
      );
      e.opciones = opciones;
    }

    return rows;
  }

  async crear(condominioId, data, usuarioId) {
    const { titulo, descripcion, fecha_inicio, fecha_fin, ponderar_por_alicuota, opciones } = data;

    if (!titulo || !fecha_inicio || !fecha_fin || !Array.isArray(opciones) || opciones.length < 2) {
      throw { statusCode: 400, message: 'Título, fechas y al menos 2 opciones son requeridos', code: 'VALIDATION_ERROR' };
    }

    const resEncuesta = await query(
      `INSERT INTO encuestas (condominio_id, creado_por, titulo, descripcion, fecha_inicio, fecha_fin, ponderar_por_alicuota, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ABIERTA')
       RETURNING *;`,
      [condominioId, usuarioId, titulo, descripcion || null, fecha_inicio, fecha_fin, ponderar_por_alicuota || false]
    );
    const encuesta = resEncuesta.rows[0];

    const opcionesCreadas = [];
    for (let i = 0; i < opciones.length; i++) {
      const resOp = await query(
        `INSERT INTO encuesta_opciones (encuesta_id, opcion_texto, orden)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [encuesta.id, opciones[i], i]
      );
      opcionesCreadas.push(resOp.rows[0]);
    }

    return { ...encuesta, opciones: opcionesCreadas };
  }

  async emitirVoto(condominioId, { encuesta_id, opcion_id, unidad_id }, usuarioId) {
    if (!encuesta_id || !opcion_id || !unidad_id) {
      throw { statusCode: 400, message: 'encuesta_id, opcion_id y unidad_id son requeridos', code: 'VALIDATION_ERROR' };
    }

    // Verificar si la encuesta está activa
    const { rows: encRows } = await query(
      `SELECT * FROM encuestas WHERE id = $1 AND condominio_id = $2 AND estado = 'ABIERTA'`,
      [encuesta_id, condominioId]
    );
    if (encRows.length === 0) {
      throw { statusCode: 400, message: 'La encuesta no existe o ya no se encuentra abierta', code: 'POLL_CLOSED' };
    }
    const encuesta = encRows[0];

    // Verificar alícuota para ponderación
    let pesoVoto = 1.0000;
    if (encuesta.ponderar_por_alicuota) {
      const { rows: unitRows } = await query('SELECT alicuota FROM unidades WHERE id = $1', [unidad_id]);
      if (unitRows.length > 0 && unitRows[0].alicuota) {
        pesoVoto = parseFloat(unitRows[0].alicuota);
      }
    }

    try {
      const { rows } = await query(
        `INSERT INTO votos (encuesta_id, opcion_id, usuario_id, unidad_id, peso_voto)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [encuesta_id, opcion_id, usuarioId, unidad_id, pesoVoto]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') { // Unique violation
        throw { statusCode: 409, message: 'Ya ha emitido su voto para esta unidad en esta encuesta', code: 'ALREADY_VOTED' };
      }
      throw err;
    }
  }

  async cerrar(condominioId, id) {
    const { rows } = await query(
      `UPDATE encuestas SET estado = 'CERRADA' WHERE id = $1 AND condominio_id = $2 RETURNING *;`,
      [id, condominioId]
    );
    if (!rows[0]) {
      throw { statusCode: 404, message: 'Asamblea/Votación no encontrada', code: 'NOT_FOUND' };
    }
    return rows[0];
  }

  async eliminar(condominioId, id) {
    const { rows } = await query(
      `DELETE FROM encuestas WHERE id = $1 AND condominio_id = $2 RETURNING *;`,
      [id, condominioId]
    );
    if (!rows[0]) {
      throw { statusCode: 404, message: 'Asamblea/Votación no encontrada', code: 'NOT_FOUND' };
    }
    return rows[0];
  }
}

const encuestasService = new EncuestasService();

class EncuestasController {
  async listar(req, res, next) {
    try {
      const encuestas = await encuestasService.listar(req.condominioId);
      return successResponse(res, encuestas);
    } catch (error) {
      next(error);
    }
  }

  async crear(req, res, next) {
    try {
      const encuesta = await encuestasService.crear(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, encuesta, 'Encuesta creada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async votar(req, res, next) {
    try {
      const voto = await encuestasService.emitirVoto(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, voto, 'Voto registrado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async cerrar(req, res, next) {
    try {
      const cerrada = await encuestasService.cerrar(req.condominioId, req.params.id);
      return successResponse(res, cerrada, 'Votación cerrada');
    } catch (error) {
      next(error);
    }
  }

  async eliminar(req, res, next) {
    try {
      const eliminada = await encuestasService.eliminar(req.condominioId, req.params.id);
      return successResponse(res, eliminada, 'Asamblea/Votación eliminada');
    } catch (error) {
      next(error);
    }
  }
}

const encuestasController = new EncuestasController();

module.exports = {
  encuestasService,
  encuestasController
};
