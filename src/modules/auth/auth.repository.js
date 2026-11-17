const { query } = require('../../config/db');

class AuthRepository {
  async findByCI(ci) {
    const { rows } = await query(
      `SELECT u.id as usuario_id, u.persona_id, u.password_hash, u.activo,
              p.ci, p.ci_expedicion, p.nombres, p.apellidos, p.email, p.telefono
       FROM personas p
       JOIN usuarios u ON u.persona_id = p.id
       WHERE p.ci = $1 AND u.deleted_at IS NULL AND p.deleted_at IS NULL`,
      [ci]
    );
    return rows[0] || null;
  }

  async findById(usuarioId) {
    const { rows } = await query(
      `SELECT u.id as usuario_id, u.persona_id, u.activo, u.ultimo_acceso,
              p.ci, p.ci_expedicion, p.nombres, p.apellidos, p.email, p.telefono
       FROM usuarios u
       JOIN personas p ON u.persona_id = p.id
       WHERE u.id = $1 AND u.deleted_at IS NULL AND p.deleted_at IS NULL`,
      [usuarioId]
    );
    return rows[0] || null;
  }

  async updateUltimoAcceso(usuarioId) {
    await query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [usuarioId]
    );
  }

  async getCondominiosByUsuario(usuarioId) {
    const { rows } = await query(
      `SELECT c.id, c.nombre, c.direccion, c.ciudad, c.logo_url, c.estado as estado_condominio,
              m.rol_id, m.estado as estado_membresia, m.fecha_inicio
       FROM membresias m
       JOIN condominios c ON m.condominio_id = c.id
       WHERE m.usuario_id = $1 
         AND m.estado = 'ACTIVO'
         AND c.deleted_at IS NULL
       ORDER BY c.nombre ASC`,
      [usuarioId]
    );
    return rows;
  }

  async getPermisosByRol(rolId) {
    const { rows } = await query(
      `SELECT permiso_id FROM rol_permisos WHERE rol_id = $1`,
      [rolId]
    );
    return rows.map(r => r.permiso_id);
  }

  async registrarDispositivo(usuarioId, { tokenFcm, plataforma, modelo }) {
    const { rows } = await query(
      `INSERT INTO dispositivos (usuario_id, token_fcm, plataforma, modelo, fecha_ultimo_uso, activo)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
       ON CONFLICT (token_fcm) 
       DO UPDATE SET usuario_id = EXCLUDED.usuario_id,
                     fecha_ultimo_uso = CURRENT_TIMESTAMP,
                     activo = TRUE
       RETURNING *;`,
      [usuarioId, tokenFcm, plataforma.toUpperCase(), modelo || null]
    );
    return rows[0];
  }
}

module.exports = new AuthRepository();
