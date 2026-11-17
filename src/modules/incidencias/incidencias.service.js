const { query } = require('../../config/db');
const storageService = require('../../services/storage.service');
const { emitToCondominio, emitToUser } = require('../../services/socket.service');
const notificationService = require('../../services/notification.service');
const auditoriaService = require('../auditoria/auditoria.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class IncidenciasRepository {
  async listar(condominioId, { estado, categoria, prioridad, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT inc.*, u.codigo as unidad_codigo,
             concat(p.nombres, ' ', p.apellidos) as reportado_por_nombre,
             concat(resp_p.nombres, ' ', resp_p.apellidos) as asignado_a_nombre,
             (SELECT COUNT(*) FROM incidencia_comentarios WHERE incidencia_id = inc.id) as total_comentarios
      FROM incidencias inc
      LEFT JOIN unidades u ON inc.unidad_id = u.id
      JOIN usuarios usr ON inc.reportado_por = usr.id
      JOIN personas p ON usr.persona_id = p.id
      LEFT JOIN usuarios resp_usr ON inc.asignado_a = resp_usr.id
      LEFT JOIN personas resp_p ON resp_usr.persona_id = resp_p.id
      WHERE inc.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (estado) {
      sql += ` AND inc.estado = $${idx++}`;
      params.push(estado);
    }
    if (categoria) {
      sql += ` AND inc.categoria = $${idx++}`;
      params.push(categoria);
    }
    if (prioridad) {
      sql += ` AND inc.prioridad = $${idx++}`;
      params.push(prioridad);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY inc.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async findById(id, condominioId) {
    const { rows } = await query(
      `SELECT inc.*, u.codigo as unidad_codigo,
              concat(p.nombres, ' ', p.apellidos) as reportado_por_nombre,
              concat(resp_p.nombres, ' ', resp_p.apellidos) as asignado_a_nombre
       FROM incidencias inc
       LEFT JOIN unidades u ON inc.unidad_id = u.id
       JOIN usuarios usr ON inc.reportado_por = usr.id
       JOIN personas p ON usr.persona_id = p.id
       LEFT JOIN usuarios resp_usr ON inc.asignado_a = resp_usr.id
       LEFT JOIN personas resp_p ON resp_usr.persona_id = resp_p.id
       WHERE inc.id = $1 AND inc.condominio_id = $2`,
      [id, condominioId]
    );
    if (!rows[0]) return null;

    // Comentarios
    const { rows: comentarios } = await query(
      `SELECT ic.*, concat(p.nombres, ' ', p.apellidos) as usuario_nombre
       FROM incidencia_comentarios ic
       JOIN usuarios u ON ic.usuario_id = u.id
       JOIN personas p ON u.persona_id = p.id
       WHERE ic.incidencia_id = $1
       ORDER BY ic.created_at ASC`,
      [id]
    );

    return {
      ...rows[0],
      comentarios
    };
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO incidencias 
       (condominio_id, unidad_id, reportado_por, categoria, titulo, descripcion, ubicacion, prioridad, fotografia_url, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDIENTE')
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id || null,
        data.reportado_por,
        data.categoria,
        data.titulo,
        data.descripcion,
        data.ubicacion || null,
        data.prioridad || 'MEDIA',
        data.fotografia_url || null
      ]
    );
    return rows[0];
  }

  async updateEstado(id, estado, asignadoA = null) {
    const { rows } = await query(
      `UPDATE incidencias
       SET estado = $1,
           asignado_a = COALESCE($2, asignado_a),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *;`,
      [estado, asignadoA, id]
    );
    return rows[0] || null;
  }

  async agregarComentario(incidenciaId, usuarioId, comentario, adjuntoUrl = null) {
    const { rows } = await query(
      `INSERT INTO incidencia_comentarios (incidencia_id, usuario_id, comentario, adjunto_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [incidenciaId, usuarioId, comentario, adjuntoUrl]
    );
    return rows[0];
  }
}

const incidenciasRepo = new IncidenciasRepository();

class IncidenciasService {
  async listar(condominioId, query) {
    return incidenciasRepo.listar(condominioId, query);
  }

  async findById(id, condominioId) {
    const inc = await incidenciasRepo.findById(id, condominioId);
    if (!inc) {
      throw { statusCode: 404, message: 'Incidencia no encontrada', code: 'NOT_FOUND' };
    }
    return inc;
  }

  async crear(condominioId, data, file, usuarioId) {
    if (!data.titulo || !data.descripcion || !data.categoria) {
      throw { statusCode: 400, message: 'Título, descripción y categoría son requeridos', code: 'VALIDATION_ERROR' };
    }

    let fotoUrl = null;
    if (file) {
      fotoUrl = await storageService.saveFile(file, 'fotografias');
    }

    const nueva = await incidenciasRepo.create({
      ...data,
      condominio_id: condominioId,
      fotografia_url: fotoUrl,
      reportado_por: usuarioId
    });

    emitToCondominio(condominioId, 'incidencia.actualizada', nueva);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'INCIDENCIA_REPORTADA',
      entidad: 'incidencias',
      entidadId: nueva.id,
      datosNuevos: nueva
    });

    return nueva;
  }

  async actualizarEstado(id, condominioId, { estado, asignado_a }, operadorId) {
    const anterior = await this.findById(id, condominioId);
    const actualizada = await incidenciasRepo.updateEstado(id, estado, asignado_a);

    emitToCondominio(condominioId, 'incidencia.actualizada', actualizada);

    // Notificar al que reportó la incidencia
    await notificationService.notifyUser(anterior.reportado_por, {
      condominioId,
      titulo: `Actualización de Incidencia: ${anterior.titulo}`,
      mensaje: `El estado de su incidencia cambió a: ${estado}.`,
      tipo: 'INCIDENCIA_ACTUALIZADA',
      dataPayload: { incidenciaId: id, estado }
    });

    await auditoriaService.registrar({
      usuarioId: operadorId,
      condominioId,
      accion: 'INCIDENCIA_ESTADO_CAMBIADO',
      entidad: 'incidencias',
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: actualizada
    });

    return actualizada;
  }

  async agregarComentario(id, condominioId, { comentario }, file, usuarioId) {
    await this.findById(id, condominioId);
    let adjuntoUrl = null;
    if (file) {
      adjuntoUrl = await storageService.saveFile(file, 'fotografias');
    }

    const nuevoComentario = await incidenciasRepo.agregarComentario(id, usuarioId, comentario, adjuntoUrl);
    emitToCondominio(condominioId, 'incidencia.comentario_agregado', { incidenciaId: id, comentario: nuevoComentario });
    return nuevoComentario;
  }
}

const incidenciasService = new IncidenciasService();

class IncidenciasController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await incidenciasService.listar(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const inc = await incidenciasService.findById(req.params.id, req.condominioId);
      return successResponse(res, inc);
    } catch (error) {
      next(error);
    }
  }

  async crear(req, res, next) {
    try {
      const nueva = await incidenciasService.crear(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, nueva, 'Incidencia reportada con éxito', 201);
    } catch (error) {
      next(error);
    }
  }

  async actualizarEstado(req, res, next) {
    try {
      const { estado, asignado_a } = req.body;
      const actualizada = await incidenciasService.actualizarEstado(req.params.id, req.condominioId, { estado, asignado_a }, req.user.usuario_id);
      return successResponse(res, actualizada, 'Estado de incidencia actualizado');
    } catch (error) {
      next(error);
    }
  }

  async agregarComentario(req, res, next) {
    try {
      const comentario = await incidenciasService.agregarComentario(req.params.id, req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, comentario, 'Comentario agregado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }
}

const incidenciasController = new IncidenciasController();

module.exports = {
  incidenciasRepo,
  incidenciasService,
  incidenciasController
};
