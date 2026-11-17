const membresiasService = require('./membresias.service');
const { successResponse } = require('../../utils/response.util');

class MembresiasController {
  async listar(req, res, next) {
    try {
      const items = await membresiasService.listarPorCondominio(req.condominioId, req.query);
      return successResponse(res, items);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const payload = {
        ...req.body,
        condominio_id: req.condominioId
      };
      const nueva = await membresiasService.create(payload, req.user.usuario_id);
      return successResponse(res, nueva, 'Membresía asignada correctamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateEstado(req, res, next) {
    try {
      const { estado } = req.body;
      const actualizada = await membresiasService.updateEstado(req.params.id, estado, req.condominioId, req.user.usuario_id);
      return successResponse(res, actualizada, 'Estado de membresía actualizado');
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await membresiasService.getRoles();
      return successResponse(res, roles);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembresiasController();
