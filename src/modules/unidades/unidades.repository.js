const { query } = require('../../config/db');

class UnidadesRepository {
  async listar(condominioId, { tipo, estado, search, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT u.id, u.condominio_id, u.codigo, u.alicuota, u.metros_cuadrados, u.estado, u.observaciones,
             b.nombre as bloque_nombre,
             p.numero as piso_numero, p.nombre as piso_nombre,
             t.nombre as tipo_nombre, t.id as tipo_id,
             (
               SELECT json_agg(json_build_object(
                 'persona_id', per.id,
                 'ci', per.ci,
                 'nombre_completo', concat(per.nombres, ' ', per.apellidos),
                 'telefono', per.telefono,
                 'porcentaje', up.porcentaje_propiedad
               ))
               FROM unidad_propietarios up
               JOIN personas per ON up.persona_id = per.id
               WHERE up.unidad_id = u.id AND up.estado = 'ACTIVO'
             ) as propietarios,
             (
               SELECT json_build_object(
                 'persona_id', per.id,
                 'ci', per.ci,
                 'nombre_completo', concat(per.nombres, ' ', per.apellidos),
                 'telefono', per.telefono,
                 'tipo', cr.tipo,
                 'fecha_inicio', cr.fecha_inicio,
                 'fecha_fin', cr.fecha_fin
               )
               FROM contratos_residencia cr
               JOIN personas per ON cr.persona_id = per.id
               WHERE cr.unidad_id = u.id AND cr.estado = 'ACTIVO'
               ORDER BY cr.id DESC LIMIT 1
             ) as residente_actual
      FROM unidades u
      LEFT JOIN bloques b ON u.bloque_id = b.id
      LEFT JOIN pisos p ON u.piso_id = p.id
      JOIN tipos_unidad t ON u.tipo_unidad_id = t.id
      WHERE u.condominio_id = $1 AND u.deleted_at IS NULL
    `;
    const params = [condominioId];
    let idx = 2;

    if (tipo) {
      sql += ` AND u.tipo_unidad_id = $${idx++}`;
      params.push(tipo);
    }
    if (estado) {
      sql += ` AND u.estado = $${idx++}`;
      params.push(estado);
    }
    if (search) {
      sql += ` AND u.codigo ILIKE $${idx++}`;
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY u.codigo ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async findById(id, condominioId) {
    const { rows } = await query(
      `SELECT u.*, 
              b.nombre as bloque_nombre,
              p.numero as piso_numero, p.nombre as piso_nombre,
              t.nombre as tipo_nombre
       FROM unidades u
       LEFT JOIN bloques b ON u.bloque_id = b.id
       LEFT JOIN pisos p ON u.piso_id = p.id
       JOIN tipos_unidad t ON u.tipo_unidad_id = t.id
       WHERE u.id = $1 AND u.condominio_id = $2 AND u.deleted_at IS NULL`,
      [id, condominioId]
    );
    if (!rows[0]) return null;

    // Obtener propietarios
    const propRes = await query(
      `SELECT up.*, p.ci, p.nombres, p.apellidos, p.email, p.telefono
       FROM unidad_propietarios up
       JOIN personas p ON up.persona_id = p.id
       WHERE up.unidad_id = $1
       ORDER BY up.estado ASC, up.id DESC`,
      [id]
    );

    // Obtener contratos de residencia
    const contRes = await query(
      `SELECT cr.*, p.ci, p.nombres, p.apellidos, p.email, p.telefono
       FROM contratos_residencia cr
       JOIN personas p ON cr.persona_id = p.id
       WHERE cr.unidad_id = $1
       ORDER BY cr.estado ASC, cr.id DESC`,
      [id]
    );

    return {
      ...rows[0],
      propietarios: propRes.rows,
      contratos_residencia: contRes.rows
    };
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO unidades (condominio_id, bloque_id, piso_id, tipo_unidad_id, codigo, alicuota, metros_cuadrados, estado, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        data.condominio_id,
        data.bloque_id || null,
        data.piso_id || null,
        data.tipo_unidad_id,
        data.codigo,
        data.alicuota || 0.0000,
        data.metros_cuadrados || null,
        data.estado || 'DISPONIBLE',
        data.observaciones || null
      ]
    );
    return rows[0];
  }

  async update(id, condominioId, data) {
    const { rows } = await query(
      `UPDATE unidades
       SET bloque_id = COALESCE($1, bloque_id),
           piso_id = COALESCE($2, piso_id),
           tipo_unidad_id = COALESCE($3, tipo_unidad_id),
           codigo = COALESCE($4, codigo),
           alicuota = COALESCE($5, alicuota),
           metros_cuadrados = COALESCE($6, metros_cuadrados),
           estado = COALESCE($7, estado),
           observaciones = COALESCE($8, observaciones),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND condominio_id = $10 AND deleted_at IS NULL
       RETURNING *;`,
      [
        data.bloque_id,
        data.piso_id,
        data.tipo_unidad_id,
        data.codigo,
        data.alicuota,
        data.metros_cuadrados,
        data.estado,
        data.observaciones,
        id,
        condominioId
      ]
    );
    return rows[0] || null;
  }

  async softDelete(id, condominioId, deletedBy) {
    await query(
      `UPDATE unidades SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3 WHERE id = $1 AND condominio_id = $2`,
      [id, condominioId, deletedBy]
    );
  }

  async asignarPropietario(data) {
    const { rows } = await query(
      `INSERT INTO unidad_propietarios (unidad_id, persona_id, porcentaje_propiedad, es_representante_legal, fecha_adquisicion, folio_real, estado)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, 'ACTIVO')
       RETURNING *;`,
      [
        data.unidad_id,
        data.persona_id,
        data.porcentaje_propiedad || 100.00,
        data.es_representante_legal !== false,
        data.fecha_adquisicion || null,
        data.folio_real || null
      ]
    );
    return rows[0];
  }

  async crearContratoResidencia(data) {
    const { rows } = await query(
      `INSERT INTO contratos_residencia (unidad_id, persona_id, tipo, fecha_inicio, fecha_fin, responsable_pago, observaciones, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVO')
       RETURNING *;`,
      [
        data.unidad_id,
        data.persona_id,
        data.tipo || 'INQUILINO',
        data.fecha_inicio,
        data.fecha_fin || null,
        data.responsable_pago !== false,
        data.observaciones || null
      ]
    );
    // Actualizar estado de unidad a OCUPADA
    await query(`UPDATE unidades SET estado = 'OCUPADA' WHERE id = $1`, [data.unidad_id]);
    return rows[0];
  }

  async getTiposUnidad() {
    const { rows } = await query('SELECT * FROM tipos_unidad ORDER BY id ASC');
    return rows;
  }

  async getBloques(condominioId) {
    const { rows } = await query('SELECT * FROM bloques WHERE condominio_id = $1 AND deleted_at IS NULL ORDER BY nombre ASC', [condominioId]);
    return rows;
  }
}

module.exports = new UnidadesRepository();
