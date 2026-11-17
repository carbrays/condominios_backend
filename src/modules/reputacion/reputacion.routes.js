const express = require('express');
const router = express.Router();
const { reputacionController } = require('./reputacion.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/persona/:persona_id', requirePermission('REPUTACION_VER'), reputacionController.obtener);
router.post('/', requirePermission('REPUTACION_CREAR'), reputacionController.calificar);

module.exports = router;
