const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const authRepo = require('./auth.repository');
const auditoriaService = require('../auditoria/auditoria.service');

class AuthService {
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, env.JWT.secret, {
      expiresIn: env.JWT.expiresIn
    });
    const refreshToken = jwt.sign({ usuarioId: payload.usuarioId }, env.JWT.refreshSecret, {
      expiresIn: env.JWT.refreshExpiresIn
    });
    return { accessToken, refreshToken };
  }

  async login(ci, password, ip = null, userAgent = null) {
    if (!ci || !password) {
      throw { statusCode: 400, message: 'CI y contraseña son requeridos', code: 'CREDENTIALS_REQUIRED' };
    }

    const user = await authRepo.findByCI(ci.trim());
    if (!user) {
      throw { statusCode: 401, message: 'Credenciales inválidas (CI no encontrado)', code: 'INVALID_CREDENTIALS' };
    }

    if (!user.activo) {
      throw { statusCode: 403, message: 'La cuenta de usuario se encuentra suspendida', code: 'ACCOUNT_SUSPENDED' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Credenciales inválidas (Contraseña incorrecta)', code: 'INVALID_CREDENTIALS' };
    }

    await authRepo.updateUltimoAcceso(user.usuario_id);

    // Obtener condominios asociados a la persona
    const condominios = await authRepo.getCondominiosByUsuario(user.usuario_id);

    // Seleccionar por defecto el primer condominio si existe
    let condominioActivo = null;
    let permisos = [];
    if (condominios.length > 0) {
      condominioActivo = condominios[0];
      permisos = await authRepo.getPermisosByRol(condominioActivo.rol_id);
    }

    const tokenPayload = {
      usuarioId: user.usuario_id,
      personaId: user.persona_id,
      ci: user.ci,
      email: user.email,
      condominioId: condominioActivo ? condominioActivo.id : null,
      rolId: condominioActivo ? condominioActivo.rol_id : null
    };

    const tokens = this.generateTokens(tokenPayload);

    await auditoriaService.registrar({
      usuarioId: user.usuario_id,
      condominioId: condominioActivo?.id || null,
      accion: 'AUTH_LOGIN',
      entidad: 'usuarios',
      entidadId: user.usuario_id,
      ip,
      userAgent
    });

    return {
      usuario: {
        id: user.usuario_id,
        persona_id: user.persona_id,
        ci: user.ci,
        ci_expedicion: user.ci_expedicion,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
        telefono: user.telefono
      },
      condominios,
      condominioActivo,
      permisos,
      tokens
    };
  }

  async me(usuarioId) {
    const user = await authRepo.findById(usuarioId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' };
    }
    const condominios = await authRepo.getCondominiosByUsuario(usuarioId);
    return {
      usuario: user,
      condominios
    };
  }

  async seleccionarCondominio(usuarioId, condominioId) {
    const condominios = await authRepo.getCondominiosByUsuario(usuarioId);
    const seleccionado = condominios.find(c => String(c.id) === String(condominioId));

    if (!seleccionado) {
      throw { statusCode: 403, message: 'No tiene membresía en el condominio seleccionado', code: 'FORBIDDEN_CONDOMINIO' };
    }

    const permisos = await authRepo.getPermisosByRol(seleccionado.rol_id);

    const user = await authRepo.findById(usuarioId);
    const tokenPayload = {
      usuarioId: user.usuario_id,
      personaId: user.persona_id,
      ci: user.ci,
      email: user.email,
      condominioId: seleccionado.id,
      rolId: seleccionado.rol_id
    };

    const tokens = this.generateTokens(tokenPayload);

    return {
      condominioActivo: seleccionado,
      permisos,
      tokens
    };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw { statusCode: 400, message: 'Refresh token requerido', code: 'TOKEN_REQUIRED' };
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT.refreshSecret);
    } catch (e) {
      throw { statusCode: 401, message: 'Refresh token expirado o inválido', code: 'INVALID_REFRESH_TOKEN' };
    }

    const user = await authRepo.findById(decoded.usuarioId);
    if (!user || !user.activo) {
      throw { statusCode: 403, message: 'Usuario no disponible', code: 'USER_INACTIVE' };
    }

    const condominios = await authRepo.getCondominiosByUsuario(user.usuario_id);
    const activo = condominios[0] || null;

    const tokenPayload = {
      usuarioId: user.usuario_id,
      personaId: user.persona_id,
      ci: user.ci,
      email: user.email,
      condominioId: activo ? activo.id : null,
      rolId: activo ? activo.rol_id : null
    };

    return this.generateTokens(tokenPayload);
  }

  async registrarDispositivo(usuarioId, data) {
    if (!data.tokenFcm || !data.plataforma) {
      throw { statusCode: 400, message: 'tokenFcm y plataforma son requeridos', code: 'DATA_MISSING' };
    }
    return authRepo.registrarDispositivo(usuarioId, data);
  }
}

module.exports = new AuthService();
