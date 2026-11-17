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
      // Si es SUPER_ADMIN puede especificar un condominio_id diferente al activo.
      // Para el resto de roles, se fuerza el condominio del contexto activo.
      const condominioId = (req.rol === 'SUPER_ADMIN' && req.body.condominio_id)
        ? parseInt(req.body.condominio_id, 10)
        : req.condominioId;

      const payload = {
        ...req.body,
        condominio_id: condominioId
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
