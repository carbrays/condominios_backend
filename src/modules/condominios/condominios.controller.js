const condominiosService = require('./condominios.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class CondominiosController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const search = req.query.search || '';

      const { items, total } = await condominiosService.listar({ page, limit, search });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const condominio = await condominiosService.findById(req.params.id);
      return successResponse(res, condominio);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const nuevo = await condominiosService.create(req.body, req.user.usuario_id);
      return successResponse(res, nuevo, 'Condominio creado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const actualizado = await condominiosService.update(req.params.id, req.body, req.user.usuario_id);
      return successResponse(res, actualizado, 'Condominio actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await condominiosService.softDelete(req.params.id, req.user.usuario_id);
      return successResponse(res, null, 'Condominio eliminado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const condominioId = req.condominioId || req.params.id;
      const stats = await condominiosService.getDashboard(condominioId);
      return successResponse(res, stats, 'Métricas de dashboard obtenidas exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CondominiosController();
