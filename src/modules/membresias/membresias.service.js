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
    const membresiaId = parseInt(id, 10);
    if (isNaN(membresiaId)) {
      throw { statusCode: 400, message: 'ID de membresía inválido', code: 'INVALID_ID' };
    }

    if (!['ACTIVO', 'SUSPENDIDO', 'INACTIVO', 'REVOCADO'].includes(estado)) {
      throw { statusCode: 400, message: 'Estado no válido', code: 'INVALID_STATUS' };
    }

    const membresiaActual = await membresiasRepo.findById(membresiaId);
    if (!membresiaActual) {
      throw { statusCode: 404, message: 'Membresía no encontrada', code: 'NOT_FOUND' };
    }

    if (String(membresiaActual.usuario_id) === String(usuarioOperadorId) && estado === 'SUSPENDIDO') {
      throw { statusCode: 400, message: 'No puedes suspender tu propia membresía activa', code: 'CANNOT_SUSPEND_SELF' };
    }

    const actualizada = await membresiasRepo.updateEstado(membresiaId, estado, usuarioOperadorId);
    if (!actualizada) {
      throw { statusCode: 404, message: 'Membresía no encontrada', code: 'NOT_FOUND' };
    }

    await auditoriaService.registrar({
      usuarioId: usuarioOperadorId,
      condominioId,
      accion: 'MEMBRESIA_ESTADO_CAMBIADO',
      entidad: 'membresias',
      entidadId: membresiaId,
      datosNuevos: { estado }
    });

    return actualizada;
  }

  async getRoles() {
    return membresiasRepo.getRoles();
  }
}

module.exports = new MembresiasService();
