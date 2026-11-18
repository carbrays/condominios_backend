const express = require('express');
const router = express.Router();
const { reservasController } = require('./reservas.service');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/areas', reservasController.getAreasComunes);
router.post('/areas', requirePermission('CONDOMINIO_EDITAR'), reservasController.createAreaComun);
router.delete('/areas/:id', requirePermission('CONDOMINIO_EDITAR'), reservasController.deleteAreaComun);

router.get('/', requirePermission('RESERVA_VER'), reservasController.listar);
router.post('/', requirePermission('RESERVA_CREAR'), reservasController.crear);
router.patch('/:id/cancelar', requirePermission('RESERVA_CREAR'), reservasController.cancelar);

module.exports = router;
