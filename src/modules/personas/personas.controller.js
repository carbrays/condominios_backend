const personasService = require('./personas.service');
const { successResponse, paginateResponse } = require('../../utils/response.util');

class PersonasController {
  async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const search = req.query.search || '';

      const { items, total } = await personasService.listar({ page, limit, search });
      return paginateResponse(res, items, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const persona = await personasService.findById(req.params.id);
      return successResponse(res, persona);
    } catch (error) {
      next(error);
    }
  }

  async findByCI(req, res, next) {
    try {
      const persona = await personasService.findByCI(req.params.ci);
      return successResponse(res, persona);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const nueva = await personasService.create(req.body, req.user.usuario_id);
      return successResponse(res, nueva, 'Persona registrada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const actualizada = await personasService.update(req.params.id, req.body, req.user.usuario_id);
      return successResponse(res, actualizada, 'Persona actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PersonasController();
