const unidadesRepo = require('./unidades.repository');
const auditoriaService = require('../auditoria/auditoria.service');

class UnidadesService {
  async listar(condominioId, query) {
    return unidadesRepo.listar(condominioId, query);
  }

  async findById(id, condominioId) {
    const unidad = await unidadesRepo.findById(id, condominioId);
    if (!unidad) {
      throw { statusCode: 404, message: 'Unidad no encontrada', code: 'NOT_FOUND' };
    }
    return unidad;
  }

  async create(data, condominioId, usuarioId) {
    if (!data.codigo || !data.tipo_unidad_id) {
      throw { statusCode: 400, message: 'Código y tipo de unidad son requeridos', code: 'VALIDATION_ERROR' };
    }

    const payload = { ...data, condominio_id: condominioId };
    const nueva = await unidadesRepo.create(payload);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'UNIDAD_CREADA',
      entidad: 'unidades',
      entidadId: nueva.id,
      datosNuevos: nueva
    });

    return nueva;
  }

  async update(id, condominioId, data, usuarioId) {
    const anterior = await this.findById(id, condominioId);
    const actualizada = await unidadesRepo.update(id, condominioId, data);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'UNIDAD_ACTUALIZADA',
      entidad: 'unidades',
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: actualizada
    });

    return actualizada;
  }

  async softDelete(id, condominioId, usuarioId) {
    await this.findById(id, condominioId);
    await unidadesRepo.softDelete(id, condominioId, usuarioId);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'UNIDAD_ELIMINADA',
      entidad: 'unidades',
      entidadId: id
    });

    return true;
  }

  async asignarPropietario(data, condominioId, usuarioId) {
    if (!data.unidad_id || !data.persona_id) {
      throw { statusCode: 400, message: 'unidad_id y persona_id son requeridos', code: 'VALIDATION_ERROR' };
    }

    const res = await unidadesRepo.asignarPropietario(data);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'PROPIETARIO_ASIGNADO',
      entidad: 'unidad_propietarios',
      entidadId: res.id,
      datosNuevos: res
    });

    return res;
  }

  async crearContratoResidencia(data, condominioId, usuarioId) {
    if (!data.unidad_id || !data.persona_id || !data.fecha_inicio) {
      throw { statusCode: 400, message: 'unidad_id, persona_id y fecha_inicio son requeridos', code: 'VALIDATION_ERROR' };
    }

    const res = await unidadesRepo.crearContratoResidencia(data);

    await auditoriaService.registrar({
      usuarioId,
      condominioId,
      accion: 'CONTRATO_RESIDENCIA_CREADO',
      entidad: 'contratos_residencia',
      entidadId: res.id,
      datosNuevos: res
    });

    return res;
  }

  async getTiposUnidad() {
    return unidadesRepo.getTiposUnidad();
  }

  async getBloques(condominioId) {
    return unidadesRepo.getBloques(condominioId);
  }
}

module.exports = new UnidadesService();
