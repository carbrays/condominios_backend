const conserjeriaService = require('./conserjeria.service');
const { successResponse, paginateResponse, errorResponse } = require('../../utils/response.util');

class ConserjeriaController {
  // Visitas
  async listarVisitas(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const soloActivas = req.query.activas === 'true';
      const { items, total } = await conserjeriaService.listarVisitas(req.condominioId, { soloActivas, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async registrarVisita(req, res, next) {
    try {
      const visita = await conserjeriaService.registrarVisita(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, visita, 'Ingreso de visita registrado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async registrarSalidaVisita(req, res, next) {
    try {
      const salida = await conserjeriaService.registrarSalidaVisita(req.params.id, req.condominioId);
      return successResponse(res, salida, 'Salida de visita registrada');
    } catch (error) {
      next(error);
    }
  }

  // Paquetería
  async listarPaqueteria(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await conserjeriaService.listarPaqueteria(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async registrarPaquete(req, res, next) {
    try {
      const paquete = await conserjeriaService.registrarPaquete(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, paquete, 'Paquete recibido y registrado en portería', 201);
    } catch (error) {
      next(error);
    }
  }

  async entregarPaquete(req, res, next) {
    try {
      const { entregado_a } = req.body;
      const entregado = await conserjeriaService.entregarPaquete(req.params.id, req.condominioId, entregado_a || 'Destinatario');
      return successResponse(res, entregado, 'Paquete marcado como entregado');
    } catch (error) {
      next(error);
    }
  }

  // Bitácora
  async listarBitacora(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await conserjeriaService.listarBitacora(req.condominioId, { page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async registrarBitacora(req, res, next) {
    try {
      const novedad = await conserjeriaService.registrarBitacora(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, novedad, 'Novedad asentada en la bitácora', 201);
    } catch (error) {
      next(error);
    }
  }

  // Pases QR
  async generarPaseQR(req, res, next) {
    try {
      const pase = await conserjeriaService.generarPaseQR(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, pase, 'Pase QR generado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async validarPaseQR(req, res, next) {
    try {
      const { codigo_seguro } = req.body;
      const resultado = await conserjeriaService.validarEscanearQR(codigo_seguro, req.condominioId, req.user.usuario_id);
      if (!resultado.valido) {
        return errorResponse(res, resultado.mensaje, resultado.codigo, 400, resultado);
      }
      return successResponse(res, resultado, resultado.mensaje);
    } catch (error) {
      next(error);
    }
  }

  // Sincronización offline en lote
  async sincronizarOffline(req, res, next) {
    try {
      const { operaciones } = req.body;
      if (!Array.isArray(operaciones)) {
        return errorResponse(res, 'Operaciones debe ser un arreglo de elementos', 'INVALID_PAYLOAD', 400);
      }
      const resultados = await conserjeriaService.sincronizarLote(req.condominioId, operaciones, req.user.usuario_id);
      return successResponse(res, resultados, 'Sincronización completada');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConserjeriaController();
