const express = require('express');
const router = express.Router();
const condominiosController = require('./condominios.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');

router.use(authenticateJWT);

router.get('/', requirePermission('CONDOMINIO_VER'), condominiosController.listar);
router.post('/', requirePermission('CONDOMINIO_CREAR'), condominiosController.create);
router.get('/dashboard', requireTenant, condominiosController.getDashboard);
router.get('/:id', requirePermission('CONDOMINIO_VER'), condominiosController.findById);
router.put('/:id', requirePermission('CONDOMINIO_EDITAR'), condominiosController.update);
router.delete('/:id', requirePermission('CONDOMINIO_EDITAR'), condominiosController.delete);

module.exports = router;
