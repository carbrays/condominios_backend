const express = require('express');
const router = express.Router();
const auditoriaService = require('./auditoria.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { paginateResponse } = require('../../utils/response.util');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('AUDITORIA_VER'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const entidad = req.query.entidad || null;

    const { items, total } = await auditoriaService.listar({
      condominioId: req.condominioId,
      entidad,
      page,
      limit
    });

    return paginateResponse(res, items, total, page, limit);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
