const { query } = require('../../config/db');
const storageService = require('../../services/storage.service');
const notificationService = require('../../services/notification.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class ServiciosRepository {
  async listar(condominioId, { unidadId, servicio, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT rs.*, u.codigo as unidad_codigo,
             concat(p.nombres, ' ', p.apellidos) as registrado_por_nombre
      FROM recibos_servicios rs
      LEFT JOIN unidades u ON rs.unidad_id = u.id
      LEFT JOIN usuarios usr ON rs.registrado_por = usr.id
      LEFT JOIN personas p ON usr.persona_id = p.id
      WHERE rs.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (unidadId) {
      sql += ` AND rs.unidad_id = $${idx++}`;
      params.push(unidadId);
    }
    if (servicio) {
      sql += ` AND rs.servicio = $${idx++}`;
      params.push(servicio);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY rs.id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO recibos_servicios
       (condominio_id, unidad_id, servicio, periodo, monto, fecha_emision, fecha_vencimiento, imagen_url, registrado_por, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'REGISTRADO')
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id || null,
        data.servicio,
        data.periodo,
        data.monto,
        data.fecha_emision || null,
        data.fecha_vencimiento || null,
        data.imagen_url,
        data.registrado_por
      ]
    );
    return rows[0];
  }
}

const serviciosRepo = new ServiciosRepository();

class ServiciosService {
  async listar(condominioId, query) {
    return serviciosRepo.listar(condominioId, query);
  }

  async registrarRecibo(condominioId, data, file, registradoPor) {
    if (!file) {
      throw { statusCode: 400, message: 'La fotografía o archivo del recibo es requerida', code: 'FILE_REQUIRED' };
    }

    const imagenUrl = await storageService.saveFile(file, 'recibos');

    const nuevo = await serviciosRepo.create({
      condominio_id: condominioId,
      unidad_id: data.unidad_id || null,
      servicio: data.servicio,
      periodo: data.periodo,
      monto: parseFloat(data.monto || 0),
      fecha_emision: data.fecha_emision || null,
      fecha_vencimiento: data.fecha_vencimiento || null,
      imagen_url: imagenUrl,
      registrado_por: registradoPor
    });

    // Si está asignado a una unidad, notificar a los residentes
    if (data.unidad_id) {
      const { rows: residentes } = await query(
        `SELECT u.id as usuario_id 
         FROM contratos_residencia cr
         JOIN personas p ON cr.persona_id = p.id
         JOIN usuarios u ON u.persona_id = p.id
         WHERE cr.unidad_id = $1 AND cr.estado = 'ACTIVO'`,
        [data.unidad_id]
      );

      for (const res of residentes) {
        await notificationService.notifyUser(res.usuario_id, {
          condominioId,
          titulo: `Nuevo recibo de ${nuevo.servicio}`,
          mensaje: `Conserjería ha registrado un recibo de ${nuevo.servicio} por Bs. ${nuevo.monto} correspondiente al periodo ${nuevo.periodo}.`,
          tipo: 'RECIBO_SERVICIO',
          dataPayload: { reciboId: nuevo.id, servicio: nuevo.servicio }
        });
      }
    }

    return nuevo;
  }
}

const serviciosService = new ServiciosService();

// Controller
class ServiciosController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await serviciosService.listar(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async registrar(req, res, next) {
    try {
      const nuevo = await serviciosService.registrarRecibo(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, nuevo, 'Recibo de servicio registrado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }
}

const serviciosController = new ServiciosController();

module.exports = {
  serviciosRepo,
  serviciosService,
  serviciosController
};
