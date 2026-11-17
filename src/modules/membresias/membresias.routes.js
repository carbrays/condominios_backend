const express = require('express');
const router = express.Router();
const membresiasController = require('./membresias.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('PERSONA_VER'), membresiasController.listar);
router.get('/roles', membresiasController.getRoles);
router.post('/', requirePermission('PERSONA_EDITAR'), membresiasController.create);
router.patch('/:id/estado', requirePermission('PERSONA_EDITAR'), membresiasController.updateEstado);

module.exports = router;
