const { query } = require('../../config/db');

class MembresiasRepository {
  async listarPorCondominio(condominioId, { rol, estado } = {}) {
    let sql = `
      SELECT m.id, m.usuario_id, m.condominio_id, m.rol_id, m.estado, m.fecha_inicio, m.fecha_fin,
             p.id as persona_id, p.ci, p.nombres, p.apellidos, p.email, p.telefono,
             r.nombre as rol_nombre
      FROM membresias m
      JOIN usuarios u ON m.usuario_id = u.id
      JOIN personas p ON u.persona_id = p.id
      JOIN roles r ON m.rol_id = r.id
      WHERE m.condominio_id = $1 AND m.deleted_at IS NULL
    `;
    const params = [condominioId];
    let idx = 2;

    if (estado && estado !== 'TODOS') {
      sql += ` AND m.estado = $${idx++}`;
      params.push(estado);
    }
    if (rol) {
      sql += ` AND m.rol_id = $${idx++}`;
      params.push(rol);
    }

    sql += ` ORDER BY p.apellidos ASC, p.nombres ASC`;

    const { rows } = await query(sql, params);
    return rows;
  }

  async findById(id) {
    const { rows } = await query(
      `SELECT * FROM membresias WHERE id = $1 AND deleted_at IS NULL`,
      [parseInt(id, 10)]
    );
    return rows[0] || null;
  }

  async findByUsuarioYCondominio(usuarioId, condominioId) {
    const { rows } = await query(
      `SELECT * FROM membresias WHERE usuario_id = $1 AND condominio_id = $2 AND deleted_at IS NULL`,
      [usuarioId, condominioId]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO membresias (usuario_id, condominio_id, rol_id, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6)
       ON CONFLICT (usuario_id, condominio_id, rol_id)
       DO UPDATE SET estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [
        data.usuario_id,
        data.condominio_id,
        data.rol_id,
        data.estado || 'ACTIVO',
        data.fecha_inicio || null,
        data.fecha_fin || null
      ]
    );
    return rows[0];
  }

  async updateEstado(id, estado, deletedBy = null) {
    const { rows } = await query(
      `UPDATE membresias 
       SET estado = $1, 
           updated_at = CURRENT_TIMESTAMP,
           deleted_at = CASE WHEN $1 = 'REVOCADO' THEN CURRENT_TIMESTAMP ELSE deleted_at END,
           deleted_by = CASE WHEN $1 = 'REVOCADO' THEN $3 ELSE deleted_by END
       WHERE id = $2
       RETURNING *;`,
      [estado, parseInt(id, 10), deletedBy]
    );
    return rows[0] || null;
  }

  async getRoles() {
    const { rows } = await query('SELECT * FROM roles ORDER BY id ASC');
    return rows;
  }
}

module.exports = new MembresiasRepository();
