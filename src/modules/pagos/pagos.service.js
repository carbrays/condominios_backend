const pagosRepo = require('./pagos.repository');
const storageService = require('../../services/storage.service');
const auditoriaService = require('../auditoria/auditoria.service');
const { emitToCondominio, emitToUser } = require('../../services/socket.service');
const notificationService = require('../../services/notification.service');

class PagosService {
  async getCuentasBancarias(condominioId) {
    return pagosRepo.getCuentasBancarias(condominioId);
  }

  async createCuentaBancaria(condominioId, data, file, usuarioId) {
    let qrUrl = data.qr_imagen_url || null;
    if (file) {
      qrUrl = await storageService.saveFile(file, 'qrs');
    }
    const nueva = await pagosRepo.createCuentaBancaria(condominioId, { ...data, qr_imagen_url: qrUrl });
    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'CUENTA_BANCARIA_QR_CREADA',
      entidad: 'cuentas_bancarias_qr',
      entidadId: nueva.id,
      datosNuevos: nueva
    });
    return nueva;
  }

  async listarPagos(condominioId, query) {
    return pagosRepo.listarPagos(condominioId, query);
  }

  async findById(id, condominioId) {
    const pago = await pagosRepo.findById(id, condominioId);
    if (!pago) {
      throw { statusCode: 404, message: 'Pago no encontrado', code: 'NOT_FOUND' };
    }
    return pago;
  }

  async registrarPago(condominioId, data, file, usuarioId) {
    if (!data.unidad_id || !data.monto || !data.fecha_pago) {
      throw { statusCode: 400, message: 'unidad_id, monto y fecha_pago son requeridos', code: 'VALIDATION_ERROR' };
    }

    let comprobanteUrl = null;
    if (file) {
      comprobanteUrl = await storageService.saveFile(file, 'comprobantes');
    }

    const nuevoPago = await pagosRepo.registrarPago({
      condominio_id: condominioId,
      unidad_id: data.unidad_id,
      expensa_id: data.expensa_id || null,
      usuario_id: usuarioId,
      monto: parseFloat(data.monto),
      fecha_pago: data.fecha_pago,
      metodo_pago: data.metodo_pago || 'QR_TRANSFERENCIA',
      referencia_transaccion: data.referencia_transaccion || null,
      comprobante_url: comprobanteUrl
    });

    // Notificar al canal del condominio (para el panel de administración)
    emitToCondominio(condominioId, 'pago.registrado', nuevoPago);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'PAGO_REGISTRADO',
      entidad: 'pagos',
      entidadId: nuevoPago.id,
      datosNuevos: nuevoPago
    });

    return nuevoPago;
  }

  async validarPago(id, condominioId, { accion, motivo_rechazo }, validadorId) {
    const pago = await this.findById(id, condominioId);
    if (pago.estado !== 'PENDIENTE') {
      throw { statusCode: 400, message: `El pago ya fue procesado previamente con estado ${pago.estado}`, code: 'ALREADY_PROCESSED' };
    }

    const estadoFinal = accion === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';
    const pagoActualizado = await pagosRepo.actualizarEstadoPago(id, estadoFinal, validadorId, motivo_rechazo || null);

    if (estadoFinal === 'APROBADO' && pago.expensa_id) {
      // Descontar saldo de la expensa
      await pagosRepo.aplicarPagoAExpensa(pago.expensa_id, pago.monto);
    }

    // Emitir eventos en tiempo real
    emitToCondominio(condominioId, estadoFinal === 'APROBADO' ? 'pago.aprobado' : 'pago.rechazado', pagoActualizado);
    emitToUser(pago.usuario_id, estadoFinal === 'APROBADO' ? 'pago.aprobado' : 'pago.rechazado', pagoActualizado);

    // Enviar notificación al residente
    await notificationService.notifyUser(pago.usuario_id, {
      condominioId,
      titulo: estadoFinal === 'APROBADO' ? 'Pago Aprobado' : 'Pago Rechazado',
      mensaje: estadoFinal === 'APROBADO'
        ? `Su pago de Bs. ${pago.monto} ha sido verificado y aprobado exitosamente.`
        : `Su pago de Bs. ${pago.monto} fue rechazado. Motivo: ${motivo_rechazo || 'Comprobante no válido'}.`,
      tipo: estadoFinal === 'APROBADO' ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO',
      dataPayload: { pagoId: id, estado: estadoFinal }
    });

    await auditoriaService.registrar({
      usuarioId: validadorId,
      condominioId,
      accion: estadoFinal === 'APROBADO' ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO',
      entidad: 'pagos',
      entidadId: id,
      datosAnteriores: pago,
      datosNuevos: pagoActualizado
    });

    return pagoActualizado;
  }
}

module.exports = new PagosService();
