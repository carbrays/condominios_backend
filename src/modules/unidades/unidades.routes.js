const express = require('express');
const router = express.Router();
const unidadesController = require('./unidades.controller');
const { authenticateJWT } = require('../../middlewares/auth.middleware');
const { requireTenant } = require('../../middlewares/tenant.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');

router.use(authenticateJWT);
router.use(requireTenant);

router.get('/', requirePermission('UNIDAD_VER'), unidadesController.listar);
router.get('/tipos', unidadesController.getTiposUnidad);
router.get('/bloques', unidadesController.getBloques);
router.get('/:id', requirePermission('UNIDAD_VER'), unidadesController.findById);
router.post('/', requirePermission('UNIDAD_CREAR'), unidadesController.create);
router.put('/:id', requirePermission('UNIDAD_EDITAR'), unidadesController.update);
router.delete('/:id', requirePermission('UNIDAD_EDITAR'), unidadesController.delete);

// Asignaciones
router.post('/asignar-propietario', requirePermission('UNIDAD_EDITAR'), unidadesController.asignarPropietario);
router.post('/contrato-residencia', requirePermission('UNIDAD_EDITAR'), unidadesController.crearContratoResidencia);

module.exports = router;
