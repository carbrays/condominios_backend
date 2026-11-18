const crypto = require('crypto');
const { query } = require('../../config/db');

class ConserjeriaRepository {
  // --- VISITAS ---
  async listarVisitas(condominioId, { soloActivas = false, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT v.*, u.codigo as unidad_codigo,
             concat(p.nombres, ' ', p.apellidos) as conserje_nombre
      FROM visitas v
      JOIN unidades u ON v.unidad_id = u.id
      LEFT JOIN usuarios usr ON v.registrado_por = usr.id
      LEFT JOIN personas p ON usr.persona_id = p.id
      WHERE v.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (soloActivas) {
      sql += ` AND v.fecha_salida IS NULL`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY v.fecha_entrada DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async registrarVisita(data) {
    const { rows } = await query(
      `INSERT INTO visitas 
       (condominio_id, unidad_id, visitante_nombre, visitante_documento, residente_id, pase_qr_id, fecha_entrada, vehiculo_placa, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_TIMESTAMP), $8, $9, $10)
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id,
        data.visitante_nombre,
        data.visitante_documento,
        data.residente_id || null,
        data.pase_qr_id || null,
        data.fecha_entrada || null,
        data.vehiculo_placa || null,
        data.observaciones || null,
        data.registrado_por
      ]
    );
    return rows[0];
  }

  async registrarSalidaVisita(id, condominioId) {
    const { rows } = await query(
      `UPDATE visitas
       SET fecha_salida = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND condominio_id = $2 AND fecha_salida IS NULL
       RETURNING *;`,
      [id, condominioId]
    );
    return rows[0] || null;
  }

  async eliminarVisita(id, condominioId) {
    const { rows } = await query(
      `DELETE FROM visitas WHERE id = $1 AND condominio_id = $2 RETURNING *;`,
      [id, condominioId]
    );
    return rows[0] || null;
  }

  // --- PAQUETERÍA ---
  async listarPaqueteria(condominioId, { estado, unidadId, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT pq.*, u.codigo as unidad_codigo,
             concat(p.nombres, ' ', p.apellidos) as conserje_nombre
      FROM paqueteria pq
      JOIN unidades u ON pq.unidad_id = u.id
      LEFT JOIN usuarios usr ON pq.recibido_por = usr.id
      LEFT JOIN personas p ON usr.persona_id = p.id
      WHERE pq.condominio_id = $1
    `;
    const params = [condominioId];
    let idx = 2;

    if (estado) {
      sql += ` AND pq.estado = $${idx++}`;
      params.push(estado);
    }
    if (unidadId) {
      sql += ` AND pq.unidad_id = $${idx++}`;
      params.push(unidadId);
    }

    const countRes = await query(`SELECT COUNT(*) FROM (${sql}) sub`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    sql += ` ORDER BY pq.fecha_recepcion DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    return { items: rows, total, page, limit };
  }

  async registrarPaquete(data) {
    const { rows } = await query(
      `INSERT INTO paqueteria
       (condominio_id, unidad_id, empresa_transporte, destinatario_nombre, remitente, codigo_paquete, fotografia_url, estado, recibido_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'RECIBIDO', $8)
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id,
        data.empresa_transporte || null,
        data.destinatario_nombre,
        data.remitente || null,
        data.codigo_paquete || null,
        data.fotografia_url || null,
        data.recibido_por
      ]
    );
    return rows[0];
  }

  async entregarPaquete(id, condominioId, entregadoA) {
    const { rows } = await query(
      `UPDATE paqueteria
       SET estado = 'ENTREGADO',
           entregado_a = $1,
           fecha_entrega = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND condominio_id = $3
       RETURNING *;`,
      [entregadoA, id, condominioId]
    );
    return rows[0] || null;
  }

  async eliminarPaquete(id, condominioId) {
    const { rows } = await query(
      `DELETE FROM paqueteria WHERE id = $1 AND condominio_id = $2 RETURNING *;`,
      [id, condominioId]
    );
    return rows[0] || null;
  }

  // --- BITÁCORA ---
  async listarBitacora(condominioId, { page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const countRes = await query('SELECT COUNT(*) FROM bitacora_conserjeria WHERE condominio_id = $1', [condominioId]);
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await query(
      `SELECT b.*, concat(p.nombres, ' ', p.apellidos) as usuario_nombre
       FROM bitacora_conserjeria b
       JOIN usuarios u ON b.usuario_id = u.id
       JOIN personas p ON u.persona_id = p.id
       WHERE b.condominio_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [condominioId, limit, offset]
    );
    return { items: rows, total, page, limit };
  }

  async registrarNovedadBitacora(data) {
    const { rows } = await query(
      `INSERT INTO bitacora_conserjeria (condominio_id, usuario_id, turno, tipo_evento, detalle, adjunto_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.condominio_id,
        data.usuario_id,
        data.turno,
        data.tipo_evento,
        data.detalle,
        data.adjunto_url || null
      ]
    );
    return rows[0];
  }

  // --- PASES QR ---
  async crearPaseQR(data) {
    const codigoSeguro = crypto.randomBytes(16).toString('hex');
    const { rows } = await query(
      `INSERT INTO pases_qr 
       (condominio_id, unidad_id, creado_por, codigo_seguro, nombre_visitante, documento_visitante, fecha_inicio, fecha_expiracion, estado, uso_multiple)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVO', $9)
       RETURNING *;`,
      [
        data.condominio_id,
        data.unidad_id,
        data.creado_por,
        codigoSeguro,
        data.nombre_visitante,
        data.documento_visitante || null,
        data.fecha_inicio || new Date().toISOString(),
        data.fecha_expiracion,
        data.uso_multiple || false
      ]
    );
    return rows[0];
  }

  async findPaseByCodigo(codigoSeguro) {
    const { rows } = await query(
      `SELECT p.*, u.codigo as unidad_codigo, c.nombre as condominio_nombre
       FROM pases_qr p
       JOIN unidades u ON p.unidad_id = u.id
       JOIN condominios c ON p.condominio_id = c.id
       WHERE p.codigo_seguro = $1`,
      [codigoSeguro]
    );
    return rows[0] || null;
  }

  async marcarPaseUsado(paseId) {
    await query(`UPDATE pases_qr SET estado = 'USADO' WHERE id = $1 AND uso_multiple = FALSE`, [paseId]);
  }
}

module.exports = new ConserjeriaRepository();
