const condominiosRepo = require('./condominios.repository');
const auditoriaService = require('../auditoria/auditoria.service');
const { emitToCondominio } = require('../../services/socket.service');

class CondominiosService {
  async listar(query) {
    return condominiosRepo.listar(query);
  }

  async findById(id) {
    const condominio = await condominiosRepo.findById(id);
    if (!condominio) {
      throw { statusCode: 404, message: 'Condominio no encontrado', code: 'NOT_FOUND' };
    }
    return condominio;
  }

  async create(data, usuarioId) {
    if (!data.nombre || !data.direccion || !data.ciudad) {
      throw { statusCode: 400, message: 'Nombre, dirección y ciudad son requeridos', code: 'VALIDATION_ERROR' };
    }

    const nuevo = await condominiosRepo.create(data);

    await auditoriaService.registrar({
      usuarioId,
      condominioId: nuevo.id,
      accion: 'CONDOMINIO_CREADO',
      entidad: 'condominios',
      entidadId: nuevo.id,
      datosNuevos: nuevo
    });

    return nuevo;
  }

  async update(id, data, usuarioId) {
    const anterior = await this.findById(id);
    const actualizado = await condominiosRepo.update(id, data);

    await auditoriaService.registrar({
      usuarioId,
      condominioId: id,
      accion: 'CONDOMINIO_ACTUALIZADO',
      entidad: 'condominios',
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: actualizado
    });

    return actualizado;
  }

  async softDelete(id, usuarioId) {
    await this.findById(id);
    await condominiosRepo.softDelete(id, usuarioId);

    await auditoriaService.registrar({
      usuarioId,
      condominioId: id,
      accion: 'CONDOMINIO_ELIMINADO',
      entidad: 'condominios',
      entidadId: id
    });

    return true;
  }

  async getDashboard(condominioId) {
    const stats = await condominiosRepo.getDashboardStats(condominioId);
    return stats;
  }
}

module.exports = new CondominiosService();
