const { query } = require('../config/db');
const { errorResponse } = require('../utils/response.util');

/**
 * Middleware para validar permisos granulares basados en roles
 * @param {string | string[]} requiredPermissions 
 */
const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'Usuario no autenticado', 'UNAUTHORIZED', 401);
      }

      const rolId = req.rol || req.user.rol_id;

      // Super Administrador tiene todos los permisos
      if (rolId === 'SUPER_ADMIN') {
        return next();
      }

      // Validar si el usuario tiene rol SUPER_ADMIN en cualquiera de sus membresías activas
      const { rows: superAdminRows } = await query(
        `SELECT id FROM membresias WHERE usuario_id = $1 AND rol_id = 'SUPER_ADMIN' AND estado = 'ACTIVO'`,
        [req.user.usuario_id]
      );
      if (superAdminRows.length > 0) {
        return next();
      }

      if (!rolId) {
        return errorResponse(res, 'Rol no especificado para esta operación', 'ROLE_MISSING', 403);
      }

      // Consultar permisos asociados al rol en DB
      const { rows } = await query(
        `SELECT permiso_id FROM rol_permisos WHERE rol_id = $1`,
        [rolId]
      );

      const userPermissions = new Set(rows.map(r => r.permiso_id));
      const hasAll = requiredPermissions.every(p => userPermissions.has(p));

      if (!hasAll) {
        return errorResponse(
          res,
          `No cuenta con los permisos necesarios: [${requiredPermissions.join(', ')}]`,
          'FORBIDDEN_PERMISSION',
          403
        );
      }

      next();
    } catch (error) {
      console.error('[PERMISSION MIDDLEWARE ERROR]', error);
      return errorResponse(res, 'Error validando permisos', 'PERMISSION_ERROR', 500);
    }
  };
};

module.exports = { requirePermission };
