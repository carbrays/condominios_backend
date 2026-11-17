const finanzasRepo = require('./finanzas.repository');
const { query } = require('../../config/db');
const auditoriaService = require('../auditoria/auditoria.service');
const { emitToCondominio } = require('../../services/socket.service');
const notificationService = require('../../services/notification.service');

class FinanzasService {
  async getConceptosGasto(condominioId) {
    return finanzasRepo.getConceptosGasto(condominioId);
  }

  async createConceptoGasto(condominioId, data, usuarioId) {
    const nuevo = await finanzasRepo.createConceptoGasto(condominioId, data);
    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'CONCEPTO_GASTO_CREADO',
      entidad: 'conceptos_gasto',
      entidadId: nuevo.id,
      datosNuevos: nuevo
    });
    return nuevo;
  }

  async listarExpensas(condominioId, query) {
    return finanzasRepo.listarExpensas(condominioId, query);
  }

  async getExpensaById(id, condominioId) {
    const exp = await finanzasRepo.findExpensaById(id, condominioId);
    if (!exp) {
      throw { statusCode: 404, message: 'Expensa no encontrada', code: 'NOT_FOUND' };
    }
    return exp;
  }

  async generarExpensasMensuales(condominioId, data, usuarioId) {
    const { periodo, concepto_id, tipo_calculo, monto_base, presupuesto_total, fecha_vencimiento, notas } = data;

    if (!periodo || !tipo_calculo || !fecha_vencimiento) {
      throw { statusCode: 400, message: 'Periodo (YYYY-MM), tipo_calculo y fecha_vencimiento son requeridos', code: 'VALIDATION_ERROR' };
    }

    // Obtener todas las unidades del condominio
    const { rows: unidades } = await query(
      `SELECT id, codigo, alicuota FROM unidades WHERE condominio_id = $1 AND deleted_at IS NULL ORDER BY codigo ASC`,
      [condominioId]
    );

    if (unidades.length === 0) {
      throw { statusCode: 400, message: 'El condominio no tiene unidades registradas', code: 'NO_UNITS' };
    }

    const fechaEmision = new Date().toISOString().substring(0, 10);
    const generadas = [];

    for (const u of unidades) {
      let montoCalculado = 0;

      if (tipo_calculo === 'ALICUOTA') {
        const base = parseFloat(presupuesto_total || 0);
        const alicuota = parseFloat(u.alicuota || 0);
        montoCalculado = Math.round(base * alicuota * 100) / 100;
      } else {
        // MONTO_FIJO
        montoCalculado = parseFloat(monto_base || 0);
      }

      // Si da 0 o negativo, asegurar monto base mínimo
      if (montoCalculado <= 0) {
        montoCalculado = parseFloat(monto_base || 100.00);
      }

      try {
        const exp = await finanzasRepo.crearExpensa({
          condominio_id: condominioId,
          unidad_id: u.id,
          concepto_id: concepto_id || null,
          periodo,
          monto_base: montoCalculado,
          monto_mora: 0.00,
          monto_descuento: 0.00,
          monto_total: montoCalculado,
          saldo_pendiente: montoCalculado,
          fecha_emision: fechaEmision,
          fecha_vencimiento,
          estado: 'PENDIENTE',
          notas
        });
        generadas.push(exp);
      } catch (err) {
        // Si ya existe la expensa para esa unidad en ese periodo, continuar
        console.warn(`[FINANZAS] Unidad ${u.codigo} ya contaba con expensa para periodo ${periodo}`);
      }
    }

    // Emitir Socket.IO y Notificación al condominio
    emitToCondominio(condominioId, 'expensa.creada', {
      periodo,
      total_generadas: generadas.length
    });

    await notificationService.notifyCondominio(condominioId, {
      titulo: `Expensa generada para el periodo ${periodo}`,
      mensaje: `Se han generado las expensas correspondientes al periodo ${periodo}. Vencimiento: ${fecha_vencimiento}.`,
      tipo: 'EXPENSA_GENERADA',
      dataPayload: { periodo }
    });

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'EXPENSAS_MASIVAS_GENERADAS',
      entidad: 'expensas',
      entidadId: periodo,
      datosNuevos: { periodo, total: generadas.length }
    });

    return {
      periodo,
      total_generadas: generadas.length,
      expensas: generadas
    };
  }

  async getEstadoDeCuenta(condominioId, unidadId) {
    const estado = await finanzasRepo.getEstadoDeCuenta(condominioId, unidadId);
    if (!estado) {
      throw { statusCode: 404, message: 'Unidad no encontrada o sin datos financieros', code: 'NOT_FOUND' };
    }
    return estado;
  }
}

module.exports = new FinanzasService();
