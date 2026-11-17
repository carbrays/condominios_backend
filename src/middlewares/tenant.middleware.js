const { query } = require('../config/db');
const { errorResponse } = require('../utils/response.util');

/**
 * Middleware para validar el contexto de condominio (multi-tenancy)
 */
const requireTenant = async (req, res, next) => {
  try {
    const condominioIdHeader = req.headers['x-condominio-id'] || req.query.condominio_id || req.body.condominio_id;

    if (!condominioIdHeader) {
      return errorResponse(res, 'Debe especificar el condominio activo (cabecera x-condominio-id)', 'TENANT_REQUIRED', 400);
    }

    const condominioId = parseInt(condominioIdHeader, 10);
    if (isNaN(condominioId)) {
      return errorResponse(res, 'Identificador de condominio inválido', 'INVALID_TENANT_ID', 400);
    }

    // 1. Verificar si el usuario es SUPER_ADMIN global
    const superAdminRes = await query(
      `SELECT m.id, m.rol_id FROM membresias m 
       WHERE m.usuario_id = $1 AND m.rol_id = 'SUPER_ADMIN' AND m.estado = 'ACTIVO'`,
      [req.user.usuario_id]
    );

    if (superAdminRes.rows.length > 0) {
      // Super admin tiene acceso a cualquier condominio activo
      const condRes = await query('SELECT id, nombre, estado FROM condominios WHERE id = $1 AND deleted_at IS NULL', [condominioId]);
      if (condRes.rows.length === 0) {
        return errorResponse(res, 'Condominio no encontrado', 'TENANT_NOT_FOUND', 404);
      }
      req.condominioId = condominioId;
      req.condominio = condRes.rows[0];
      req.rol = 'SUPER_ADMIN';
      req.membership = { rol_id: 'SUPER_ADMIN', estado: 'ACTIVO' };
      return next();
    }

    // 2. Verificar membresía del usuario en este condominio específico
    const { rows } = await query(
      `SELECT m.id as membresia_id, m.rol_id, m.estado,
              c.id as condominio_id, c.nombre as condominio_nombre, c.estado as condominio_estado
       FROM membresias m
       JOIN condominios c ON m.condominio_id = c.id
       WHERE m.usuario_id = $1 
         AND m.condominio_id = $2
         AND m.estado = 'ACTIVO'
         AND c.deleted_at IS NULL`,
      [req.user.usuario_id, condominioId]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'No tiene una membresía activa en este condominio', 'TENANT_FORBIDDEN', 403);
    }

    req.condominioId = condominioId;
    req.condominio = {
      id: rows[0].condominio_id,
      nombre: rows[0].condominio_nombre,
      estado: rows[0].condominio_estado
    };
    req.rol = rows[0].rol_id;
    req.membership = rows[0];

    next();
  } catch (error) {
    console.error('[TENANT MIDDLEWARE ERROR]', error);
    return errorResponse(res, 'Error validando contexto del condominio', 'TENANT_ERROR', 500);
  }
};

module.exports = { requireTenant };
