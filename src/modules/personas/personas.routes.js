const express = require('express');
const router = express.Router();
const personasController = require('./personas.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);

router.get('/', requirePermission('PERSONA_VER'), personasController.listar);
router.get('/ci/:ci', requirePermission('PERSONA_VER'), personasController.findByCI);
router.get('/:id', requirePermission('PERSONA_VER'), personasController.findById);
router.post('/', requirePermission('PERSONA_CREAR'), personasController.create);
router.put('/:id', requirePermission('PERSONA_EDITAR'), personasController.update);

module.exports = router;
