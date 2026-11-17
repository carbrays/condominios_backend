const { query } = require('../../config/db');
const storageService = require('../../services/storage.service');
const notificationService = require('../../services/notification.service');
const auditoriaService = require('../auditoria/auditoria.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class ComunicadosRepository {
  async listar(condominioId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const countRes = await query(
      `SELECT COUNT(*) FROM comunicados WHERE condominio_id = $1 AND estado = 'PUBLICADO'`,
      [condominioId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await query(
      `SELECT c.*, concat(p.nombres, ' ', p.apellidos) as autor_nombre
       FROM comunicados c
       JOIN usuarios u ON c.autor_id = u.id
       JOIN personas p ON u.persona_id = p.id
       WHERE c.condominio_id = $1 AND c.estado = 'PUBLICADO'
       ORDER BY c.fecha_publicacion DESC
       LIMIT $2 OFFSET $3`,
      [condominioId, limit, offset]
    );

    return { items: rows, total, page, limit };
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO comunicados (condominio_id, autor_id, titulo, contenido, prioridad, adjunto_url, fecha_expiracion, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLICADO')
       RETURNING *;`,
      [
        data.condominio_id,
        data.autor_id,
        data.titulo,
        data.contenido,
        data.prioridad || 'NORMAL',
        data.adjunto_url || null,
        data.fecha_expiracion || null
      ]
    );
    return rows[0];
  }
}

const comunicadosRepo = new ComunicadosRepository();

class ComunicadosService {
  async listar(condominioId, query) {
    return comunicadosRepo.listar(condominioId, query);
  }

  async publicar(condominioId, data, file, autorId) {
    if (!data.titulo || !data.contenido) {
      throw { statusCode: 400, message: 'Título y contenido son requeridos', code: 'VALIDATION_ERROR' };
    }

    let adjuntoUrl = null;
    if (file) {
      adjuntoUrl = await storageService.saveFile(file, 'documentos');
    }

    const comunicado = await comunicadosRepo.create({
      condominio_id: condominioId,
      autor_id: autorId,
      titulo: data.titulo,
      contenido: data.contenido,
      prioridad: data.prioridad || 'NORMAL',
      adjunto_url: adjuntoUrl,
      fecha_expiracion: data.fecha_expiracion || null
    });

    // Enviar a todos los residentes (Persistencia + Socket.IO + FCM)
    await notificationService.notifyCondominio(condominioId, {
      titulo: `[COMUNICADO] ${comunicado.titulo}`,
      mensaje: comunicado.contenido.substring(0, 150) + (comunicado.contenido.length > 150 ? '...' : ''),
      tipo: 'COMUNICADO_PUBLICADO',
      dataPayload: { comunicadoId: comunicado.id, prioridad: comunicado.prioridad }
    });

    await auditoriaService.registrar({
      usuarioId: autorId,
      condominioId,
      accion: 'COMUNICADO_PUBLICADO',
      entidad: 'comunicados',
      entidadId: comunicado.id,
      datosNuevos: comunicado
    });

    return comunicado;
  }
}

const comunicadosService = new ComunicadosService();

class ComunicadosController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const { items, total } = await comunicadosService.listar(req.condominioId, { page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async publicar(req, res, next) {
    try {
      const comunicado = await comunicadosService.publicar(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, comunicado, 'Comunicado publicado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }
}

const comunicadosController = new ComunicadosController();

module.exports = {
  comunicadosRepo,
  comunicadosService,
  comunicadosController
};
