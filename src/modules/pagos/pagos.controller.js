const pagosService = require('./pagos.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class PagosController {
  async getCuentasBancarias(req, res, next) {
    try {
      const cuentas = await pagosService.getCuentasBancarias(req.condominioId);
      return successResponse(res, cuentas);
    } catch (error) {
      next(error);
    }
  }

  async createCuentaBancaria(req, res, next) {
    try {
      const nueva = await pagosService.createCuentaBancaria(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, nueva, 'Cuenta bancaria registrada con éxito', 201);
    } catch (error) {
      next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await pagosService.listarPagos(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const pago = await pagosService.findById(req.params.id, req.condominioId);
      return successResponse(res, pago);
    } catch (error) {
      next(error);
    }
  }

  async registrarPago(req, res, next) {
    try {
      const nuevo = await pagosService.registrarPago(req.condominioId, req.body, req.file, req.user.usuario_id);
      return successResponse(res, nuevo, 'Comprobante de pago enviado para validación', 201);
    } catch (error) {
      next(error);
    }
  }

  async validarPago(req, res, next) {
    try {
      const { accion, motivo_rechazo } = req.body;
      const resultado = await pagosService.validarPago(req.params.id, req.condominioId, { accion, motivo_rechazo }, req.user.usuario_id);
      return successResponse(res, resultado, `Pago ${resultado.estado.toLowerCase()} exitosamente`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PagosController();
