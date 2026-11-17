const { query } = require('../../config/db');

class CondominiosRepository {
  async listar({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE deleted_at IS NULL';
    const params = [];

    if (search) {
      whereClause += ' AND (nombre ILIKE $1 OR ciudad ILIKE $1 OR nit ILIKE $1)';
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) FROM condominios ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const queryParams = search ? [params[0], limit, offset] : [limit, offset];
    const limitOffset = search ? 'LIMIT $2 OFFSET $3' : 'LIMIT $1 OFFSET $2';

    const { rows } = await query(
      `SELECT id, nombre, nit, direccion, ciudad, telefono, email, logo_url, 
              fondo_reserva, dia_limite_pago, porcentaje_mora_mensual, estado, created_at
       FROM condominios
       ${whereClause}
       ORDER BY id DESC
       ${limitOffset}`,
      queryParams
    );

    return { items: rows, total, page, limit };
  }

  async findById(id) {
    const { rows } = await query(
      `SELECT * FROM condominios WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  async create(data) {
    const { rows } = await query(
      `INSERT INTO condominios 
       (nombre, nit, direccion, ciudad, telefono, email, logo_url, fondo_reserva, dia_limite_pago, porcentaje_mora_mensual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        data.nombre,
        data.nit || null,
        data.direccion,
        data.ciudad,
        data.telefono || null,
        data.email || null,
        data.logo_url || null,
        data.fondo_reserva || 0.00,
        data.dia_limite_pago || 10,
        data.porcentaje_mora_mensual || 0.00
      ]
    );
    return rows[0];
  }

  async update(id, data) {
    const { rows } = await query(
      `UPDATE condominios 
       SET nombre = COALESCE($1, nombre),
           nit = COALESCE($2, nit),
           direccion = COALESCE($3, direccion),
           ciudad = COALESCE($4, ciudad),
           telefono = COALESCE($5, telefono),
           email = COALESCE($6, email),
           logo_url = COALESCE($7, logo_url),
           fondo_reserva = COALESCE($8, fondo_reserva),
           dia_limite_pago = COALESCE($9, dia_limite_pago),
           porcentaje_mora_mensual = COALESCE($10, porcentaje_mora_mensual),
           estado = COALESCE($11, estado),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND deleted_at IS NULL
       RETURNING *;`,
      [
        data.nombre,
        data.nit,
        data.direccion,
        data.ciudad,
        data.telefono,
        data.email,
        data.logo_url,
        data.fondo_reserva,
        data.dia_limite_pago,
        data.porcentaje_mora_mensual,
        data.estado,
        id
      ]
    );
    return rows[0] || null;
  }

  async softDelete(id, deletedBy) {
    await query(
      `UPDATE condominios SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2 WHERE id = $1`,
      [id, deletedBy]
    );
  }

  async getDashboardStats(condominioId) {
    // 1. Conteo de unidades
    const unidadesRes = await query(
      `SELECT 
         COUNT(*) as total_unidades,
         COUNT(*) FILTER (WHERE estado = 'OCUPADA') as ocupadas,
         COUNT(*) FILTER (WHERE estado = 'DISPONIBLE') as disponibles
       FROM unidades 
       WHERE condominio_id = $1 AND deleted_at IS NULL`,
      [condominioId]
    );

    // 2. Finanzas del mes actual (YYYY-MM)
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const expensasRes = await query(
      `SELECT 
         COALESCE(SUM(monto_total), 0) as total_facturado,
         COALESCE(SUM(monto_total - saldo_pendiente), 0) as cobrado,
         COALESCE(SUM(saldo_pendiente), 0) as pendiente,
         COUNT(*) FILTER (WHERE estado = 'EN_MORA' OR (fecha_vencimiento < CURRENT_DATE AND saldo_pendiente > 0)) as unidades_mora
       FROM expensas
       WHERE condominio_id = $1 AND periodo = $2`,
      [condominioId, currentPeriod]
    );

    // 3. Incidencias activas
    const incidenciasRes = await query(
      `SELECT 
         COUNT(*) as total_pendientes
       FROM incidencias
       WHERE condominio_id = $1 AND estado IN ('PENDIENTE', 'EN_PROCESO')`,
      [condominioId]
    );

    // 4. Reservas de hoy
    const reservasRes = await query(
      `SELECT COUNT(*) as reservas_hoy
       FROM reservas
       WHERE condominio_id = $1 AND fecha_reserva = CURRENT_DATE AND estado = 'CONFIRMADA'`,
      [condominioId]
    );

    // 5. Visitas activas en este momento (sin fecha de salida)
    const visitasRes = await query(
      `SELECT COUNT(*) as visitas_activas
       FROM visitas
       WHERE condominio_id = $1 AND fecha_salida IS NULL`,
      [condominioId]
    );

    // 6. Fondo de reserva actual
    const condRes = await query('SELECT fondo_reserva FROM condominios WHERE id = $1', [condominioId]);

    return {
      periodo: currentPeriod,
      unidades: {
        total: parseInt(unidadesRes.rows[0].total_unidades, 10),
        ocupadas: parseInt(unidadesRes.rows[0].ocupadas, 10),
        disponibles: parseInt(unidadesRes.rows[0].disponibles, 10)
      },
      finanzas: {
        total_facturado: parseFloat(expensasRes.rows[0].total_facturado),
        cobrado: parseFloat(expensasRes.rows[0].cobrado),
        pendiente: parseFloat(expensasRes.rows[0].pendiente),
        unidades_en_mora: parseInt(expensasRes.rows[0].unidades_mora, 10),
        fondo_reserva: parseFloat(condRes.rows[0]?.fondo_reserva || 0)
      },
      operaciones: {
        incidencias_pendientes: parseInt(incidenciasRes.rows[0].total_pendientes, 10),
        reservas_hoy: parseInt(reservasRes.rows[0].reservas_hoy, 10),
        visitas_en_curso: parseInt(visitasRes.rows[0].visitas_activas, 10)
      }
    };
  }
}

module.exports = new CondominiosRepository();
