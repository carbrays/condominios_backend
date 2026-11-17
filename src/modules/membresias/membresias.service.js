const membresiasRepo = require('./membresias.repository');
const auditoriaService = require('../auditoria/auditoria.service');

class MembresiasService {
  async listarPorCondominio(condominioId, filters) {
    return membresiasRepo.listarPorCondominio(condominioId, filters);
  }

  async create(data, usuarioOperadorId) {
    if (!data.usuario_id || !data.condominio_id || !data.rol_id) {
      throw { statusCode: 400, message: 'usuario_id, condominio_id y rol_id son requeridos', code: 'VALIDATION_ERROR' };
    }

    const nueva = await membresiasRepo.create(data);

    await auditoriaService.registrar({
      usuarioId: usuarioOperadorId,
      condominioId: data.condominio_id,
      accion: 'MEMBRESIA_ASIGNADA',
      entidad: 'membresias',
      entidadId: nueva.id,
      datosNuevos: nueva
    });

    return nueva;
  }

  async updateEstado(id, estado, condominioId, usuarioOperadorId) {
    const actualizada = await membresiasRepo.updateEstado(id, estado, usuarioOperadorId);
    if (!actualizada) {
      throw { statusCode: 404, message: 'Membresía no encontrada', code: 'NOT_FOUND' };
    }

    await auditoriaService.registrar({
      usuarioId: usuarioOperadorId,
      condominioId,
      accion: 'MEMBRESIA_ESTADO_CAMBIADO',
      entidad: 'membresias',
      entidadId: id,
      datosNuevos: { estado }
    });

    return actualizada;
  }

  async getRoles() {
    return membresiasRepo.getRoles();
  }
}

module.exports = new MembresiasService();
