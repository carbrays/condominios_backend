const express = require('express');
const router = express.Router();
const { encuestasController } = require('./encuestas.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('ENCUESTA_VER'), encuestasController.listar);
router.post('/', requirePermission('ENCUESTA_CREAR'), encuestasController.crear);
router.post('/votar', requirePermission('ENCUESTA_VOTAR'), encuestasController.votar);

module.exports = router;
