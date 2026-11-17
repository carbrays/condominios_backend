const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { errorResponse } = require('../utils/response.util');

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Token de autenticación no proporcionado', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, env.JWT.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'El token ha expirado. Por favor refresque su sesión.', 'TOKEN_EXPIRED', 401);
      }
      return errorResponse(res, 'Token inválido', 'INVALID_TOKEN', 401);
    }

    // Validar existencia y estado activo en PostgreSQL
    const { rows } = await query(
      `SELECT u.id as usuario_id, u.persona_id, u.activo,
              p.ci, p.nombres, p.apellidos, p.email
       FROM usuarios u
       JOIN personas p ON u.persona_id = p.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [decoded.usuarioId]
    );

    if (rows.length === 0 || !rows[0].activo) {
      return errorResponse(res, 'Usuario inactivo o suspendido', 'USER_INACTIVE', 403);
    }

    req.user = {
      ...rows[0],
      condominio_id: decoded.condominioId || null,
      rol_id: decoded.rolId || null
    };
    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]', error);
    return errorResponse(res, 'Error validando autenticación', 'AUTH_ERROR', 500);
  }
};

module.exports = { authenticateJWT };
