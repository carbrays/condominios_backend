const { query } = require('../../config/db');

class FinanzasRepository {
  async getConceptosGasto(condominioId) {
    const { rows } = await query(
      `SELECT * FROM conceptos_gasto WHERE condominio_id = $1 AND activo = TRUE ORDER BY nombre ASC`,
      [condominioId]
    );
    return rows;
  }

  async createConceptoGasto(condominioId, data) {
    const { rows } = await query(
      `INSERT INTO conceptos_gasto (condominio_id, nombre, tipo, descripcion, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *;`,
      [condominioId, data.nombre, data.tipo || 'ORDINARIA', data.descripcion || null]
    );
    return rows[0];
  }

  async listarExpensas(condominioId, { periodo, unidadId, estado, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT e.*, 
             u.codigo as unidad_codigo, u.alicuota,
             cg.nombre as concepto_nombre, cg.tipo as concepto_tipo
      FROM expensas e
      JOIN unidades u ON e.unidad_id = u.id
      LEFT JOIN conceptos_gasto cg ON e.concepto_id = cg.id
      WHERE e.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (periodo) {
      sql += ` AND e.periodo = $${idx++}`;
      params.push(periodo);
    }
    if (unidadId) {
      sql += ` AND e.unidad_id = $${idx++}`;
      params.push(unidadId);
    }
    if (estado) {
      sql += ` AND e.estado = $${idx++}`;
      params.push(estado);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY e.periodo DESC, u.codigo ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async findExpensaById(id, condominioId) {
    const { rows } = await query(
      `SELECT e.*, u.codigo as unidad_codigo, u.alicuota,
              cg.nombre as concepto_nombre
       FROM expensas e
       JOIN unidades u ON e.unidad_id = u.id
       LEFT JOIN conceptos_gasto cg ON e.concepto_id = cg.id
       WHERE e.id = $1 AND e.condominio_id = $2`,
      [id, condominioId]
    );
    return rows[0] || null;
  }

  async crearExpensa(data) {
    const { rows } = await query(
      `INSERT INTO expensas 
       (condominio_id, unidad_id, concepto_id, periodo, monto_base, monto_mora, monto_descuento, monto_total, saldo_pendiente, fecha_emision, fecha_vencimiento, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id,
        data.concepto_id || null,
        data.periodo,
        data.monto_base,
        data.monto_mora || 0.00,
        data.monto_descuento || 0.00,
        data.monto_total,
        data.saldo_pendiente,
        data.fecha_emision,
        data.fecha_vencimiento,
        data.estado || 'PENDIENTE',
        data.notas || null
      ]
    );
    return rows[0];
  }

  async getEstadoDeCuenta(condominioId, unidadId) {
    // 1. Obtener datos de la unidad
    const { rows: unitRows } = await query(
      `SELECT u.id, u.codigo, u.alicuota, c.nombre as condominio_nombre, c.porcentaje_mora_mensual
       FROM unidades u
       JOIN condominios c ON u.condominio_id = c.id
       WHERE u.id = $1 AND u.condominio_id = $2`,
      [unidadId, condominioId]
    );
    if (!unitRows[0]) return null;

    // 2. Historial de Expensas
    const { rows: expensas } = await query(
      `SELECT e.*, cg.nombre as concepto_nombre
       FROM expensas e
       LEFT JOIN conceptos_gasto cg ON e.concepto_id = cg.id
       WHERE e.unidad_id = $1 AND e.condominio_id = $2
       ORDER BY e.periodo DESC`,
      [unidadId, condominioId]
    );

    // 3. Historial de Pagos
    const { rows: pagos } = await query(
      `SELECT p.*, per.nombres, per.apellidos
       FROM pagos p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN personas per ON u.persona_id = per.id
       WHERE p.unidad_id = $1 AND p.condominio_id = $2
       ORDER BY p.fecha_pago DESC`,
      [unidadId, condominioId]
    );

    // 4. Calcular saldos
    let saldoTotalPendiente = 0;
    let moraTotal = 0;
    expensas.forEach(exp => {
      saldoTotalPendiente += parseFloat(exp.saldo_pendiente);
      moraTotal += parseFloat(exp.monto_mora || 0);
    });

    return {
      unidad: unitRows[0],
      saldo_actual: saldoTotalPendiente,
      mora_acumulada: moraTotal,
      expensas,
      pagos
    };
  }
}

module.exports = new FinanzasRepository();
