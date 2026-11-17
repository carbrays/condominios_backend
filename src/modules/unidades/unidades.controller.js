const unidadesService = require('./unidades.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class UnidadesController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const { items, total } = await unidadesService.listar(req.condominioId, { ...req.query, page, limit });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const unidad = await unidadesService.findById(req.params.id, req.condominioId);
      return successResponse(res, unidad);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const nueva = await unidadesService.create(req.body, req.condominioId, req.user.usuario_id);
      return successResponse(res, nueva, 'Unidad creada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const actualizada = await unidadesService.update(req.params.id, req.condominioId, req.body, req.user.usuario_id);
      return successResponse(res, actualizada, 'Unidad actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await unidadesService.softDelete(req.params.id, req.condominioId, req.user.usuario_id);
      return successResponse(res, null, 'Unidad eliminada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async asignarPropietario(req, res, next) {
    try {
      const result = await unidadesService.asignarPropietario(req.body, req.condominioId, req.user.usuario_id);
      return successResponse(res, result, 'Propietario asignado a la unidad correctamente');
    } catch (error) {
      next(error);
    }
  }

  async crearContratoResidencia(req, res, next) {
    try {
      const result = await unidadesService.crearContratoResidencia(req.body, req.condominioId, req.user.usuario_id);
      return successResponse(res, result, 'Contrato de residencia registrado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async getTiposUnidad(req, res, next) {
    try {
      const tipos = await unidadesService.getTiposUnidad();
      return successResponse(res, tipos);
    } catch (error) {
      next(error);
    }
  }

  async getBloques(req, res, next) {
    try {
      const bloques = await unidadesService.getBloques(req.condominioId);
      return successResponse(res, bloques);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UnidadesController();
