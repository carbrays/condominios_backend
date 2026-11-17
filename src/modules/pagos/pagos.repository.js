const { query } = require('../../config/db');

class PagosRepository {
  async getCuentasBancarias(condominioId) {
    const { rows } = await query(
      `SELECT * FROM cuentas_bancarias_qr WHERE condominio_id = $1 AND activo = TRUE ORDER BY id ASC`,
      [condominioId]
    );
    return rows;
  }

  async createCuentaBancaria(condominioId, data) {
    const { rows } = await query(
      `INSERT INTO cuentas_bancarias_qr (condominio_id, banco, tipo_cuenta, numero_cuenta, titular, qr_imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        condominioId,
        data.banco,
        data.tipo_cuenta || null,
        data.numero_cuenta,
        data.titular,
        data.qr_imagen_url || null
      ]
    );
    return rows[0];
  }

  async listarPagos(condominioId, { estado, unidadId, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT p.*, 
             u.codigo as unidad_codigo,
             e.periodo as expensa_periodo,
             per.ci as residente_ci,
             concat(per.nombres, ' ', per.apellidos) as residente_nombre,
             concat(val_per.nombres, ' ', val_per.apellidos) as validador_nombre
      FROM pagos p
      JOIN unidades u ON p.unidad_id = u.id
      JOIN usuarios us ON p.usuario_id = us.id
      JOIN personas per ON us.persona_id = per.id
      LEFT JOIN expensas e ON p.expensa_id = e.id
      LEFT JOIN usuarios val_us ON p.validado_por = val_us.id
      LEFT JOIN personas val_per ON val_us.persona_id = val_per.id
      WHERE p.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (estado) {
      sql += ` AND p.estado = $${idx++}`;
      params.push(estado);
    }
    if (unidadId) {
      sql += ` AND p.unidad_id = $${idx++}`;
      params.push(unidadId);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY p.id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async findById(id, condominioId) {
    const { rows } = await query(
      `SELECT p.*, u.codigo as unidad_codigo, e.periodo, e.saldo_pendiente, e.monto_total
       FROM pagos p
       JOIN unidades u ON p.unidad_id = u.id
       LEFT JOIN expensas e ON p.expensa_id = e.id
       WHERE p.id = $1 AND p.condominio_id = $2`,
      [id, condominioId]
    );
    return rows[0] || null;
  }

  async registrarPago(data) {
    const { rows } = await query(
      `INSERT INTO pagos 
       (condominio_id, unidad_id, expensa_id, usuario_id, monto, fecha_pago, metodo_pago, referencia_transaccion, comprobante_url, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDIENTE')
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id,
        data.expensa_id || null,
        data.usuario_id,
        data.monto,
        data.fecha_pago,
        data.metodo_pago || 'QR_TRANSFERENCIA',
        data.referencia_transaccion || null,
        data.comprobante_url || null
      ]
    );
    return rows[0];
  }

  async actualizarEstadoPago(id, estado, validadoPor, motivoRechazo = null) {
    const { rows } = await query(
      `UPDATE pagos
       SET estado = $1,
           validado_por = $2,
           motivo_rechazo = $3,
           fecha_validacion = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *;`,
      [estado, validadoPor, motivoRechazo, id]
    );
    return rows[0];
  }

  async aplicarPagoAExpensa(expensaId, montoPagado) {
    // 1. Obtener expensa actual
    const { rows } = await query('SELECT id, saldo_pendiente, monto_total FROM expensas WHERE id = $1', [expensaId]);
    if (rows.length === 0) return null;

    const exp = rows[0];
    const nuevoSaldo = Math.max(0, parseFloat(exp.saldo_pendiente) - parseFloat(montoPagado));
    const nuevoEstado = nuevoSaldo === 0 ? 'PAGADO' : 'PARCIAL';

    const updateRes = await query(
      `UPDATE expensas
       SET saldo_pendiente = $1,
           estado = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *;`,
      [nuevoSaldo, nuevoEstado, expensaId]
    );
    return updateRes.rows[0];
  }
}

module.exports = new PagosRepository();
