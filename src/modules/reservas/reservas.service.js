const { query } = require('../../config/db');
const { emitToCondominio, emitToUser } = require('../../services/socket.service');
const notificationService = require('../../services/notification.service');
const auditoriaService = require('../auditoria/auditoria.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class ReservasRepository {
  async getAreasComunes(condominioId) {
    const { rows } = await query(
      `SELECT * FROM areas_comunes WHERE condominio_id = $1 AND activo = TRUE ORDER BY nombre ASC`,
      [condominioId]
    );
    return rows;
  }

  async createAreaComun(condominioId, data) {
    const { rows } = await query(
      `INSERT INTO areas_comunes
       (condominio_id, nombre, descripcion, capacidad_maxima, costo_reserva, garantia, hora_inicio, hora_fin, duracion_maxima_horas, reglas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        condominioId,
        data.nombre,
        data.descripcion || null,
        data.capacidad_maxima || 10,
        data.costo_reserva || 0.00,
        data.garantia || 0.00,
        data.hora_inicio || '08:00',
        data.hora_fin || '23:00',
        data.duracion_maxima_horas || 4,
        data.reglas || null
      ]
    );
    return rows[0];
  }

  async listarReservas(condominioId, { areaId, fecha, estado, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT r.*, ac.nombre as area_nombre, u.codigo as unidad_codigo,
             concat(p.nombres, ' ', p.apellidos) as solicitante_nombre
      FROM reservas r
      JOIN areas_comunes ac ON r.area_comun_id = ac.id
      JOIN unidades u ON r.unidad_id = u.id
      JOIN usuarios usr ON r.usuario_id = usr.id
      JOIN personas p ON usr.persona_id = p.id
      WHERE r.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (areaId) {
      sql += ` AND r.area_comun_id = $${idx++}`;
      params.push(areaId);
    }
    if (fecha) {
      sql += ` AND r.fecha_reserva = $${idx++}`;
      params.push(fecha);
    }
    if (estado) {
      sql += ` AND r.estado = $${idx++}`;
      params.push(estado);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async checkSolapamiento(areaId, fecha, horaInicio, horaFin, excludeReservaId = null) {
    let sql = `
      SELECT id FROM reservas
      WHERE area_comun_id = $1
        AND fecha_reserva = $2
        AND estado IN ('CONFIRMADA', 'PENDIENTE')
        AND NOT (hora_fin <= $3 OR hora_inicio >= $4)
    `;
    const params = [areaId, fecha, horaInicio, horaFin];

    if (excludeReservaId) {
      sql += ` AND id != $5`;
      params.push(excludeReservaId);
    }

    const { rows } = await query(sql, params);
    return rows.length > 0;
  }

  async checkUsuarioEnMora(condominioId, unidadId) {
    const { rows } = await query(
      `SELECT id, periodo, saldo_pendiente, fecha_vencimiento
       FROM expensas
       WHERE condominio_id = $1 
         AND unidad_id = $2
         AND saldo_pendiente > 0
         AND (estado = 'EN_MORA' OR fecha_vencimiento < CURRENT_DATE)
       LIMIT 1;`,
      [condominioId, unidadId]
    );
    return rows.length > 0;
  }

  async crearReserva(data) {
    const { rows } = await query(
      `INSERT INTO reservas (area_comun_id, condominio_id, unidad_id, usuario_id, fecha_reserva, hora_inicio, hora_fin, estado, costo_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMADA', $8)
       RETURNING *;`,
      [
        data.area_comun_id,
        data.condominio_id,
        data.unidad_id,
        data.usuario_id,
        data.fecha_reserva,
        data.hora_inicio,
        data.hora_fin,
        data.costo_total || 0.00
      ]
    );
    return rows[0];
  }

  async cancelarReserva(id, condominioId, motivoCancelacion) {
    const { rows } = await query(
      `UPDATE reservas
       SET estado = 'CANCELADA',
           motivo_cancelacion = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND condominio_id = $3
       RETURNING *;`,
      [motivoCancelacion, id, condominioId]
    );
    return rows[0] || null;
  }
}

const reservasRepo = new ReservasRepository();

class ReservasService {
  async getAreasComunes(condominioId) {
    return reservasRepo.getAreasComunes(condominioId);
  }

  async createAreaComun(condominioId, data, usuarioId) {
    const nueva = await reservasRepo.createAreaComun(condominioId, data);
    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'AREA_COMUN_CREADA',
      entidad: 'areas_comunes',
      entidadId: nueva.id,
      datosNuevos: nueva
    });
    return nueva;
  }

  async listarReservas(condominioId, query) {
    return reservasRepo.listarReservas(condominioId, query);
  }

  async crearReserva(condominioId, data, usuarioId) {
    const { area_comun_id, unidad_id, fecha_reserva, hora_inicio, hora_fin } = data;

    if (!area_comun_id || !unidad_id || !fecha_reserva || !hora_inicio || !hora_fin) {
      throw { statusCode: 400, message: 'Todos los campos de horario, área y unidad son requeridos', code: 'VALIDATION_ERROR' };
    }

    // 1. REGLA DE NEGOCIO: Validar que el usuario o unidad NO esté en mora
    const enMora = await reservasRepo.checkUsuarioEnMora(condominioId, unidad_id);
    if (enMora) {
      throw {
        statusCode: 403,
        message: 'No es posible realizar reservas: la unidad registra expensas pendientes o en mora.',
        code: 'RESIDENT_IN_ARREARS'
      };
    }

    // 2. REGLA DE NEGOCIO: Evitar reservas solapadas
    const haySolapamiento = await reservasRepo.checkSolapamiento(area_comun_id, fecha_reserva, hora_inicio, hora_fin);
    if (haySolapamiento) {
      throw {
        statusCode: 409,
        message: 'El área común seleccionada ya se encuentra reservada en el horario solicitado.',
        code: 'OVERLAPPING_RESERVATION'
      };
    }

    // Obtener costo del área común
    const { rows: areaRows } = await query('SELECT costo_reserva FROM areas_comunes WHERE id = $1', [area_comun_id]);
    const costo = areaRows[0]?.costo_reserva || 0.00;

    const reserva = await reservasRepo.crearReserva({
      area_comun_id,
      condominio_id: condominioId,
      unidad_id,
      usuario_id: usuarioId,
      fecha_reserva,
      hora_inicio,
      hora_fin,
      costo_total: costo
    });

    emitToCondominio(condominioId, 'reserva.creada', reserva);

    await notificationService.notifyUser(usuarioId, {
      condominioId,
      titulo: 'Reserva Confirmada',
      mensaje: `Su reserva para el día ${fecha_reserva} (${hora_inicio} - ${hora_fin}) ha sido confirmada exitosamente.`,
      tipo: 'RESERVA_CONFIRMADA',
      dataPayload: { reservaId: reserva.id }
    });

    return reserva;
  }

  async cancelarReserva(id, condominioId, motivo, usuarioId) {
    const reserva = await reservasRepo.cancelarReserva(id, condominioId, motivo);
    if (!reserva) {
      throw { statusCode: 404, message: 'Reserva no encontrada', code: 'NOT_FOUND' };
    }

    emitToCondominio(condominioId, 'reserva.cancelada', reserva);
    return reserva;
  }
}

const reservasService = new ReservasService();

// Controller
class ReservasController {
  async getAreasComunes(req, res, next) {
    try {
      const areas = await reservasService.getAreasComunes(req.condominioId);
      return successResponse(res, areas);
    } catch (error) {
      next(error);
    }
  }

  async createAreaComun(req, res, next) {
    try {
      const area = await reservasService.createAreaComun(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, area, 'Área común registrada con éxito', 201);
    } catch (error) {
      next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await reservasService.listarReservas(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async crear(req, res, next) {
    try {
      const nueva = await reservasService.crearReserva(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, nueva, 'Reserva confirmada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req, res, next) {
    try {
      const { motivo } = req.body;
      const cancelada = await reservasService.cancelarReserva(req.params.id, req.condominioId, motivo, req.user.usuario_id);
      return successResponse(res, cancelada, 'Reserva cancelada correctamente');
    } catch (error) {
      next(error);
    }
  }
}

const reservasController = new ReservasController();

module.exports = {
  reservasRepo,
  reservasService,
  reservasController
};
