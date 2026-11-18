const { query } = require('../../config/db');

class PersonasRepository {
  async listar({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.deleted_at IS NULL';
    const params = [];

    if (search) {
      whereClause += ' AND (p.ci ILIKE $1 OR p.nombres ILIKE $1 OR p.apellidos ILIKE $1 OR p.email ILIKE $1)';
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM personas p ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = search ? [params[0], limit, offset] : [limit, offset];
    const limitOffset = search ? 'LIMIT $2 OFFSET $3' : 'LIMIT $1 OFFSET $2';

    const { rows } = await query(
      `SELECT p.*, u.id as usuario_id, u.activo as usuario_activo
       FROM personas p
       LEFT JOIN usuarios u ON u.persona_id = p.id AND u.deleted_at IS NULL
       ${whereClause}
       ORDER BY p.apellidos ASC, p.nombres ASC
       ${limitOffset}`,
      queryParams
    );

    return { items: rows, total, page, limit };
  }

  async findById(id) {
    const { rows } = await query(
      `SELECT p.*, u.id as usuario_id, u.activo as usuario_activo
       FROM personas p
       LEFT JOIN usuarios u ON u.persona_id = p.id AND u.deleted_at IS NULL
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  async findByCI(ci) {
    const { rows } = await query(
      `SELECT * FROM personas WHERE ci = $1 AND deleted_at IS NULL`,
      [ci]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO personas (ci, ci_expedicion, nombres, apellidos, email, telefono, fecha_nacimiento, direccion_alternativa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.ci,
        data.ci_expedicion || null,
        data.nombres,
        data.apellidos,
        data.email || null,
        data.telefono || null,
        data.fecha_nacimiento || null,
        data.direccion_alternativa || null
      ]
    );
    return rows[0];
  }

  async update(id, data) {
    const { rows } = await query(
      `UPDATE personas
       SET ci = COALESCE($1, ci),
           ci_expedicion = COALESCE($2, ci_expedicion),
           nombres = COALESCE($3, nombres),
           apellidos = COALESCE($4, apellidos),
           email = COALESCE($5, email),
           telefono = COALESCE($6, telefono),
           fecha_nacimiento = COALESCE($7, fecha_nacimiento),
           direccion_alternativa = COALESCE($8, direccion_alternativa),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND deleted_at IS NULL
       RETURNING *;`,
      [
        data.ci,
        data.ci_expedicion,
        data.nombres,
        data.apellidos,
        data.email,
        data.telefono,
        data.fecha_nacimiento,
        data.direccion_alternativa,
        id
      ]
    );
    return rows[0] || null;
  }

  async delete(id, usuarioId) {
    const { rows } = await query(
      `UPDATE personas
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id;`,
      [id, usuarioId]
    );
    return rows[0] || null;
  }
}

module.exports = new PersonasRepository();
