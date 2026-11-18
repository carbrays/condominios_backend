const bcrypt = require('bcryptjs');
const personasRepo = require('./personas.repository');
const { query } = require('../../config/db');
const auditoriaService = require('../auditoria/auditoria.service');

class PersonasService {
  async listar(options) {
    return personasRepo.listar(options);
  }

  async findById(id) {
    const persona = await personasRepo.findById(id);
    if (!persona) {
      throw { statusCode: 404, message: 'Persona no encontrada', code: 'NOT_FOUND' };
    }
    return persona;
  }

  async findByCI(ci) {
    return personasRepo.findByCI(ci);
  }

  async create(data, usuarioId) {
    if (!data.ci || !data.nombres || !data.apellidos) {
      throw { statusCode: 400, message: 'CI, nombres y apellidos son requeridos', code: 'VALIDATION_ERROR' };
    }

    const existingCI = await personasRepo.findByCI(data.ci.trim());
    if (existingCI) {
      throw { statusCode: 409, message: 'Ya existe una persona registrada con este CI', code: 'CI_DUPLICATED' };
    }

    const nuevaPersona = await personasRepo.create(data);

    // Opcionalmente crear cuenta de usuario si se especifica
    let usuarioCreado = null;
    if (data.crear_usuario || data.password) {
      const password = data.password || 'password123';
      const hash = await bcrypt.hash(password, 10);
      const resUser = await query(
        `INSERT INTO usuarios (persona_id, password_hash, activo)
         VALUES ($1, $2, TRUE)
         RETURNING id, activo;`,
        [nuevaPersona.id, hash]
      );
      usuarioCreado = resUser.rows[0];
    }

    await auditoriaService.registrar({
      usuarioId,
      accion: 'PERSONA_CREADA',
      entidad: 'personas',
      entidadId: nuevaPersona.id,
      datosNuevos: { ...nuevaPersona, usuario: usuarioCreado }
    });

    return {
      ...nuevaPersona,
      usuario: usuarioCreado
    };
  }

  async update(id, data, usuarioId) {
    const anterior = await this.findById(id);
    const actualizada = await personasRepo.update(id, data);

    await auditoriaService.registrar({
      usuarioId,
      accion: 'PERSONA_ACTUALIZADA',
      entidad: 'personas',
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: actualizada
    });

    return actualizada;
  }

  async delete(id, usuarioId) {
    const anterior = await this.findById(id);
    await personasRepo.delete(id, usuarioId);

    await auditoriaService.registrar({
      usuarioId,
      accion: 'PERSONA_ELIMINADA',
      entidad: 'personas',
      entidadId: id,
      datosAnteriores: anterior
    });

    return true;
  }
}

module.exports = new PersonasService();
