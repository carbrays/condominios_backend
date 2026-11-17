const QRCode = require('qrcode');
const conserjeriaRepo = require('./conserjeria.repository');
const storageService = require('../../services/storage.service');
const notificationService = require('../../services/notification.service');
const auditoriaService = require('../auditoria/auditoria.service');
const { emitToCondominio, emitToUser } = require('../../services/socket.service');
const { query } = require('../../config/db');

class ConserjeriaService {
  // --- VISITAS ---
  async listarVisitas(condominioId, query) {
    return conserjeriaRepo.listarVisitas(condominioId, query);
  }

  async registrarVisita(condominioId, data, conserjeId) {
    if (!data.unidad_id || !data.visitante_nombre || !data.visitante_documento) {
      throw { statusCode: 400, message: 'unidad_id, visitante_nombre y visitante_documento son requeridos', code: 'VALIDATION_ERROR' };
    }

    const visita = await conserjeriaRepo.registrarVisita({
      ...data,
      condominio_id: condominioId,
      registrado_por: conserjeId
    });

    // Notificar en tiempo real por Socket.IO al condominio
    emitToCondominio(condominioId, 'visita.registrada', visita);

    // Notificar a los residentes de la unidad
    const { rows: residentes } = await query(
      `SELECT u.id as usuario_id 
       FROM contratos_residencia cr
       JOIN personas p ON cr.persona_id = p.id
       JOIN usuarios u ON u.persona_id = p.id
       WHERE cr.unidad_id = $1 AND cr.estado = 'ACTIVO'`,
      [data.unidad_id]
    );

    for (const r of residentes) {
      await notificationService.notifyUser(r.usuario_id, {
        condominioId,
        titulo: 'Visita Registrada en Portería',
        mensaje: `${data.visitante_nombre} (Doc: ${data.visitante_documento}) ha ingresado al condominio con destino a su unidad.`,
        tipo: 'VISITA_REGISTRADA',
        dataPayload: { visitaId: visita.id, unidadId: data.unidad_id }
      });
    }

    return visita;
  }

  async registrarSalidaVisita(id, condominioId) {
    const salida = await conserjeriaRepo.registrarSalidaVisita(id, condominioId);
    if (!salida) {
      throw { statusCode: 404, message: 'Visita no encontrada o ya tiene registrada la salida', code: 'NOT_FOUND' };
    }
    emitToCondominio(condominioId, 'visita.salida', salida);
    return salida;
  }

  // --- PAQUETERÍA ---
  async listarPaqueteria(condominioId, query) {
    return conserjeriaRepo.listarPaqueteria(condominioId, query);
  }

  async registrarPaquete(condominioId, data, file, conserjeId) {
    if (!data.unidad_id || !data.destinatario_nombre) {
      throw { statusCode: 400, message: 'unidad_id y destinatario_nombre son requeridos', code: 'VALIDATION_ERROR' };
    }

    let fotoUrl = null;
    if (file) {
      fotoUrl = await storageService.saveFile(file, 'fotografias');
    }

    const paquete = await conserjeriaRepo.registrarPaquete({
      ...data,
      condominio_id: condominioId,
      fotografia_url: fotoUrl,
      recibido_por: conserjeId
    });

    emitToCondominio(condominioId, 'paquete.recibido', paquete);

    // Notificar residentes
    const { rows: residentes } = await query(
      `SELECT u.id as usuario_id 
       FROM contratos_residencia cr
       JOIN personas p ON cr.persona_id = p.id
       JOIN usuarios u ON u.persona_id = p.id
       WHERE cr.unidad_id = $1 AND cr.estado = 'ACTIVO'`,
      [data.unidad_id]
    );

    for (const r of residentes) {
      await notificationService.notifyUser(r.usuario_id, {
        condominioId,
        titulo: 'Paquete recibido en Conserjería',
        mensaje: `Ha llegado un paquete para ${data.destinatario_nombre}. Puede pasar a recogerlo por portería.`,
        tipo: 'PAQUETE_RECIBIDO',
        dataPayload: { paqueteId: paquete.id, unidadId: data.unidad_id }
      });
    }

    return paquete;
  }

  async entregarPaquete(id, condominioId, entregadoA) {
    const entregado = await conserjeriaRepo.entregarPaquete(id, condominioId, entregadoA);
    if (!entregado) {
      throw { statusCode: 404, message: 'Paquete no encontrado', code: 'NOT_FOUND' };
    }
    emitToCondominio(condominioId, 'paquete.entregado', entregado);
    return entregado;
  }

  // --- BITÁCORA ---
  async listarBitacora(condominioId, query) {
    return conserjeriaRepo.listarBitacora(condominioId, query);
  }

  async registrarBitacora(condominioId, data, file, conserjeId) {
    let adjuntoUrl = null;
    if (file) {
      adjuntoUrl = await storageService.saveFile(file, 'documentos');
    }

    const novedad = await conserjeriaRepo.registrarNovedadBitacora({
      ...data,
      condominio_id: condominioId,
      adjunto_url: adjuntoUrl,
      usuario_id: conserjeId
    });

    return novedad;
  }

  // --- PASES QR ---
  async generarPaseQR(condominioId, data, usuarioId) {
    if (!data.unidad_id || !data.nombre_visitante || !data.fecha_expiracion) {
      throw { statusCode: 400, message: 'unidad_id, nombre_visitante y fecha_expiracion son requeridos', code: 'VALIDATION_ERROR' };
    }

    const pase = await conserjeriaRepo.crearPaseQR({
      ...data,
      condominio_id: condominioId,
      creado_por: usuarioId
    });

    // Generar imagen DataURL para renderizar en Angular / Flutter
    const qrData = JSON.stringify({
      code: pase.codigo_seguro,
      condominio_id: condominioId,
      unidad_id: pase.unidad_id
    });
    const qrDataUrl = await QRCode.toDataURL(qrData);

    return {
      ...pase,
      qr_image: qrDataUrl
    };
  }

  async validarEscanearQR(codigoSeguro, condominioId, conserjeId) {
    const pase = await conserjeriaRepo.findPaseByCodigo(codigoSeguro);
    if (!pase) {
      return { valido: false, codigo: 'QR_NO_ENCONTRADO', mensaje: 'El código QR no existe en el sistema.' };
    }

    if (String(pase.condominio_id) !== String(condominioId)) {
      return { valido: false, codigo: 'CONDOMINIO_INCORRECTO', mensaje: 'Este pase pertenece a otro condominio.' };
    }

    if (pase.estado === 'CANCELADO') {
      return { valido: false, codigo: 'QR_CANCELADO', mensaje: 'Este pase fue cancelado por el residente.' };
    }

    if (pase.estado === 'USADO' && !pase.uso_multiple) {
      return { valido: false, codigo: 'QR_USADO', mensaje: 'Este pase QR ya fue utilizado anteriormente.' };
    }

    const now = new Date();
    if (new Date(pase.fecha_expiracion) < now) {
      return { valido: false, codigo: 'QR_EXPIRADO', mensaje: 'El pase QR ha expirado.' };
    }

    if (new Date(pase.fecha_inicio) > now) {
      return { valido: false, codigo: 'QR_NO_INICIADO', mensaje: 'El pase QR aún no está vigente.' };
    }

    // Registrar ingreso automáticamente
    const visita = await this.registrarVisita(condominioId, {
      unidad_id: pase.unidad_id,
      visitante_nombre: pase.nombre_visitante,
      visitante_documento: pase.documento_visitante || 'PASE_QR',
      residente_id: pase.creado_por,
      pase_qr_id: pase.id,
      observaciones: 'Ingreso mediante escaneo de código QR autorizado'
    }, conserjeId);

    // Marcar como usado si corresponde
    await conserjeriaRepo.marcarPaseUsado(pase.id);

    return {
      valido: true,
      mensaje: 'Acceso autorizado exitosamente',
      pase,
      visita
    };
  }

  // --- SINCRONIZACIÓN OFFLINE ---
  async sincronizarLote(condominioId, operaciones, conserjeId) {
    const resultados = [];

    for (const op of operaciones) {
      try {
        const { tipo, payload, sync_uuid } = op;

        if (tipo === 'REGISTRAR_VISITA') {
          // Idempotencia: verificar si ya existe registro con la misma observación o sync_uuid
          const existente = await query(
            `SELECT id FROM visitas WHERE condominio_id = $1 AND visitante_documento = $2 AND fecha_entrada = $3 LIMIT 1`,
            [condominioId, payload.visitante_documento, payload.fecha_entrada]
          );

          if (existente.rows.length === 0) {
            const v = await this.registrarVisita(condominioId, payload, conserjeId);
            resultados.push({ sync_uuid, status: 'SYNCED', id: v.id });
          } else {
            resultados.push({ sync_uuid, status: 'SYNCED', id: existente.rows[0].id, duplicate: true });
          }
        } else if (tipo === 'REGISTRAR_PAQUETE') {
          const p = await conserjeriaRepo.registrarPaquete({
            ...payload,
            condominio_id: condominioId,
            recibido_por: conserjeId
          });
          resultados.push({ sync_uuid, status: 'SYNCED', id: p.id });
        } else if (tipo === 'REGISTRAR_BITACORA') {
          const b = await conserjeriaRepo.registrarNovedadBitacora({
            ...payload,
            condominio_id: condominioId,
            usuario_id: conserjeId
          });
          resultados.push({ sync_uuid, status: 'SYNCED', id: b.id });
        }
      } catch (err) {
        resultados.push({ sync_uuid: op.sync_uuid, status: 'ERROR', error: err.message });
      }
    }

    return resultados;
  }
}

module.exports = new ConserjeriaService();
