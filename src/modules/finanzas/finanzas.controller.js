const finanzasService = require('./finanzas.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class FinanzasController {
  async getConceptosGasto(req, res, next) {
    try {
      const conceptos = await finanzasService.getConceptosGasto(req.condominioId);
      return successResponse(res, conceptos);
    } catch (error) {
      next(error);
    }
  }

  async createConceptoGasto(req, res, next) {
    try {
      const nuevo = await finanzasService.createConceptoGasto(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, nuevo, 'Concepto de gasto creado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async listarExpensas(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await finanzasService.listarExpensas(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getExpensaById(req, res, next) {
    try {
      const exp = await finanzasService.getExpensaById(req.params.id, req.condominioId);
      return successResponse(res, exp);
    } catch (error) {
      next(error);
    }
  }

  async generarExpensasMensuales(req, res, next) {
    try {
      const result = await finanzasService.generarExpensasMensuales(req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, result, 'Expensas generadas exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async getEstadoDeCuenta(req, res, next) {
    try {
      const { unidad_id } = req.params;
      const estado = await finanzasService.getEstadoDeCuenta(req.condominioId, unidad_id);
      return successResponse(res, estado);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FinanzasController();
