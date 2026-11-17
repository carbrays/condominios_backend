const authService = require('./auth.service');
const { successResponse } = require('../../utils/response.util');

class AuthController {
  async login(req, res, next) {
    try {
      const { ci, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(ci, password, ip, userAgent);
      return successResponse(res, result, 'Inicio de sesión exitoso');
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const result = await authService.me(req.user.usuario_id);
      return successResponse(res, result, 'Perfil obtenido exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async getCondominios(req, res, next) {
    try {
      const result = await authService.me(req.user.usuario_id);
      return successResponse(res, result.condominios, 'Condominios obtenidos exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async seleccionarCondominio(req, res, next) {
    try {
      const { condominio_id } = req.body;
      const result = await authService.seleccionarCondominio(req.user.usuario_id, condominio_id);
      return successResponse(res, result, 'Condominio seleccionado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const tokens = await authService.refresh(refresh_token);
      return successResponse(res, tokens, 'Token refrescado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      return successResponse(res, null, 'Sesión cerrada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async registrarDispositivo(req, res, next) {
    try {
      const dispositivo = await authService.registrarDispositivo(req.user.usuario_id, req.body);
      return successResponse(res, dispositivo, 'Dispositivo registrado para notificaciones push');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
